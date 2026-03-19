import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { fetchCandles } from '@/lib/binance';
import { computeSignals } from '@/lib/signals';
import { fetchBTCMarkets, getTimeframeFromMarket } from '@/lib/polymarket';
import { scoreSignals } from '@/lib/scorer';
import { calculateBetSize } from '@/lib/sizer';
import { validateTradeWithAI } from '@/lib/openai';
import {
  getSettings,
  getOpenTrades,
  getTradesInLastHour,
  appendTrade,
  appendObservation,
  updateSettings,
} from '@/lib/sheets';
import { Trade, Observation, Signals } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettings();

    if (!settings.trading_enabled) {
      return NextResponse.json({ status: 'paused', message: 'Trading disabled' });
    }

    // Check blackout hours (CST = UTC-6)
    const now = new Date();
    const cstHour = (now.getUTCHours() - 6 + 24) % 24;
    if (settings.blackout_hours.includes(cstHour)) {
      return NextResponse.json({ status: 'blackout', hour: cstHour });
    }

    // Check rate limit
    const tradesLastHour = await getTradesInLastHour();
    if (tradesLastHour >= settings.max_trades_per_hour) {
      return NextResponse.json({ status: 'rate_limited', trades: tradesLastHour });
    }

    // Check max simultaneous
    const openTrades = await getOpenTrades();
    if (openTrades.length >= settings.max_simultaneous) {
      return NextResponse.json({ status: 'max_open', open: openTrades.length });
    }

    // Fetch BTC candles and compute signals
    const candles = await fetchCandles('BTCUSDT', '1m', 100);
    const signals = computeSignals(candles);

    // Fetch active BTC markets from Polymarket
    const markets = await fetchBTCMarkets();

    if (markets.length === 0) {
      return NextResponse.json({ status: 'no_markets' });
    }

    const results: { market: string; action: string; tradeId?: string }[] = [];

    for (const market of markets) {
      const timeframe = getTimeframeFromMarket(market);

      // Skip if timeframe not in settings
      if (!settings.timeframes.includes(timeframe) && timeframe !== 5 && timeframe !== 15) {
        continue;
      }

      // Skip if entry price too high
      if (market.yesPrice > settings.entry_price_max) {
        await logObservation(market.id, market.question, timeframe, market, signals, 0, 'TIER3', false, '', `Price too high: ${market.yesPrice}`);
        continue;
      }

      // Score signals
      const { total: score, tier } = scoreSignals(signals, settings);

      // Already have open trade on this market?
      const alreadyOpen = openTrades.some(t => t.trade.market_id === market.id);
      if (alreadyOpen) {
        await logObservation(market.id, market.question, timeframe, market, signals, score, tier, false, '', 'Already have open trade');
        continue;
      }

      let shouldTrade = false;
      let aiDecision = '';
      let aiConfidence = 0;
      let aiReasoning = '';

      if (tier === 'TIER1') {
        // Auto-trade
        shouldTrade = true;
      } else if (tier === 'TIER2' && settings.ai_enabled) {
        // AI validation
        const aiResult = await validateTradeWithAI({
          question: market.question,
          signals,
          score,
          entryPrice: market.yesPrice,
          timeframeMin: timeframe,
        });
        aiDecision = aiResult.decision;
        aiConfidence = aiResult.confidence;
        aiReasoning = aiResult.reasoning;
        shouldTrade = aiResult.decision === 'YES' && aiResult.confidence >= settings.ai_confidence_min;
      }
      // TIER3: skip

      if (shouldTrade && openTrades.length < settings.max_simultaneous) {
        // Place simulated trade
        const betSize = calculateBetSize(market.yesPrice, settings, settings.bankroll);
        const contracts = betSize / market.yesPrice;
        const tradeId = uuid();

        const trade: Trade = {
          id: tradeId,
          timestamp: now.toISOString(),
          market_id: market.id,
          question: market.question,
          slug: market.slug,
          side: 'YES',
          entry_price: market.yesPrice,
          timeframe_min: timeframe,
          end_time: market.endDate,
          amount_usd: betSize,
          contracts: Math.round(contracts * 10000) / 10000,
          tier,
          confidence_score: score,
          status: 'open',
          resolution: '',
          close_price: 0,
          pnl_gross: 0,
          taker_fee: 0,
          gas_fee: 0,
          pnl_net: 0,
          bankroll_after: settings.bankroll - betSize,
          btc_price: signals.btcPrice,
          rsi7: signals.rsi7,
          momentum_5m: signals.momentum5m,
          adx: signals.adx,
          volume_ratio: signals.volumeRatio,
          chop: signals.chop,
          ai_decision: aiDecision,
          ai_confidence: aiConfidence,
          ai_reasoning: aiReasoning,
        };

        await appendTrade(trade);

        // Update bankroll
        await updateSettings({ bankroll: settings.bankroll - betSize });
        settings.bankroll -= betSize;

        await logObservation(market.id, market.question, timeframe, market, signals, score, tier, true, tradeId, '');

        results.push({ market: market.question, action: 'TRADED', tradeId });
      } else {
        const skipReason = tier === 'TIER3'
          ? `Score too low: ${score}`
          : tier === 'TIER2' && !shouldTrade
            ? `AI skipped: ${aiDecision} (${aiConfidence}%)`
            : 'Max trades reached';

        await logObservation(market.id, market.question, timeframe, market, signals, score, tier, false, '', skipReason);
        results.push({ market: market.question, action: 'SKIPPED' });
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: now.toISOString(),
      btcPrice: signals.btcPrice,
      marketsScanned: markets.length,
      results,
    });
  } catch (error) {
    console.error('Tick error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

async function logObservation(
  marketId: string,
  question: string,
  timeframe: number,
  market: { endDate: string; yesPrice: number; noPrice: number },
  signals: Signals,
  score: number,
  tier: string,
  traded: boolean,
  tradeId: string,
  skipReason: string
) {
  const obs: Observation = {
    id: uuid(),
    timestamp: new Date().toISOString(),
    market_id: marketId,
    question,
    timeframe_min: timeframe,
    end_time: market.endDate,
    yes_price: market.yesPrice,
    no_price: market.noPrice,
    btc_price: signals.btcPrice,
    rsi7: signals.rsi7,
    momentum_1m: signals.momentum1m,
    momentum_5m: signals.momentum5m,
    adx: signals.adx,
    volume_ratio: signals.volumeRatio,
    bb_width: signals.bbWidth,
    vwap_distance: signals.vwapDistance,
    chop: signals.chop,
    absorption: signals.absorption,
    score,
    tier,
    traded,
    trade_id: tradeId,
    skip_reason: skipReason,
    market_outcome: '',
  };
  await appendObservation(obs);
}
