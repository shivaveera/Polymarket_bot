import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { fetchCandles } from '@/lib/binance';
import { computeSignals } from '@/lib/signals';
import { fetchBTCMarkets, getTimeframeFromMarket } from '@/lib/polymarket';
import { scoreSignals } from '@/lib/scorer';
import { calculateBetSize } from '@/lib/sizer';
import { simulateTrade } from '@/lib/simulator';
import { validateTradeWithAI } from '@/lib/openai';
import {
  getSettings,
  getOpenTrades,
  getTradesInLastHour,
  appendTrade,
  appendObservation,
  updateSettings,
  checkCircuitBreaker,
  appendPreOrder,
  getPendingPreOrders,
  getPreOrderBySlug,
  updatePreOrderStatus,
} from '@/lib/sheets';
import { sendTradeNotification, sendCircuitBreakerAlert } from '@/lib/notifications';
import { Trade, Observation, Signals, PreOrder } from '@/types';
import { getNextWindowTimestamp, getCurrentWindowSlug, shouldPlacePreOrder, simulatePreOrderFill } from '@/lib/preorder';

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

    // Circuit breaker check
    const breaker = await checkCircuitBreaker(settings);
    if (breaker.tripped) {
      await updateSettings({ trading_enabled: false });
      await sendCircuitBreakerAlert(breaker.reason, settings);
      return NextResponse.json({ status: 'circuit_breaker', reason: breaker.reason });
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

    // Compute regime from 5m momentum
    const regime = signals.momentum5m > 0.10 ? 'bull' : signals.momentum5m < -0.10 ? 'bear' : 'sideways';

    // Compute a quick score for pre-order decisions
    const quickScore = scoreSignals(signals, settings);

    const results: { market: string; action: string; tradeId?: string }[] = [];

    // ===== PHASE 0: Pre-order check for NEXT window =====
    if (settings.preorder_enabled) {
      for (const tf of settings.timeframes) {
        const next = getNextWindowTimestamp(tf);
        const secondsUntil = next.start - Math.floor(Date.now() / 1000);

        // Get current live market's YES price (for mean-reversion check)
        const currentSlug = getCurrentWindowSlug(tf);
        const currentMarket = markets.find(m => m.slug === currentSlug);
        const currentYesPrice = currentMarket?.yesPrice || 0.50;

        const preOrderDecision = shouldPlacePreOrder({
          secondsUntilNextWindow: secondsUntil,
          placeBeforeSeconds: settings.preorder_before_seconds,
          currentWindowYesPrice: currentYesPrice,
          signalScore: quickScore.total,
          settings,
        });

        if (preOrderDecision.shouldPlace) {
          // Check if we already have a pre-order for this slug
          const existingPreOrder = await getPreOrderBySlug(next.slug);
          if (!existingPreOrder) {
            const size = calculateBetSize(0.505, settings, settings.bankroll);
            const preorder: PreOrder = {
              id: uuid(),
              slug: next.slug,
              market_id: '',
              side: 'YES',
              limit_price: 0.505,
              amount: size,
              window_start: new Date(next.start * 1000).toISOString(),
              window_end: new Date(next.end * 1000).toISOString(),
              status: 'pending',
              fill_price: 0,
              is_maker: true,
              signal_score: quickScore.total,
              placed_at: now.toISOString(),
              filled_at: '',
            };
            await appendPreOrder(preorder);
            results.push({ market: next.slug, action: 'PREORDER_PLACED' });
          }
        }
      }
    }

    // ===== PHASE 0.5: Check if pending pre-orders should now be filled =====
    const pendingPreOrders = await getPendingPreOrders();
    for (const { preorder: po, rowIndex } of pendingPreOrders) {
      const market = markets.find(m => m.slug === po.slug);
      if (market && market.active) {
        const fill = simulatePreOrderFill({
          limitPrice: po.limit_price,
          marketYesPrice: market.yesPrice,
          spread: 0.01,
        });
        if (fill.filled) {
          // Convert pre-order to actual trade (with isMaker = true)
          const tradeId = uuid();
          const contracts = po.amount / fill.fillPrice;

          const trade: Trade = {
            id: tradeId,
            timestamp: now.toISOString(),
            market_id: market.id,
            question: market.question,
            slug: market.slug,
            side: 'YES',
            entry_price: fill.fillPrice,
            timeframe_min: getTimeframeFromMarket(market),
            end_time: market.endDate,
            amount_usd: po.amount,
            contracts: Math.round(contracts * 10000) / 10000,
            tier: 'TIER1',
            confidence_score: po.signal_score,
            status: 'open',
            resolution: '',
            close_price: 0,
            pnl_gross: 0,
            taker_fee: 0,
            gas_fee: 0,
            pnl_net: 0,
            bankroll_after: settings.bankroll - po.amount,
            btc_price: signals.btcPrice,
            rsi7: signals.rsi7,
            momentum_5m: signals.momentum5m,
            adx: signals.adx,
            volume_ratio: signals.volumeRatio,
            chop: signals.chop,
            regime,
            ai_decision: 'PREORDER',
            ai_confidence: 100,
            ai_reasoning: 'Maker pre-order filled',
            exit_reason: '',
            exit_price: 0,
            savings_vs_hold: 0,
            is_maker: true,
            maker_rebate: 0,
          };

          await appendTrade(trade);
          await sendTradeNotification(trade, settings);
          await updatePreOrderStatus(rowIndex, 'filled', fill.fillPrice, now.toISOString());

          // Update bankroll
          const newBankroll = settings.bankroll - po.amount;
          const peakUpdate: Record<string, number | boolean> = { bankroll: newBankroll };
          if (newBankroll > settings.peak_bankroll) {
            peakUpdate.peak_bankroll = newBankroll;
          }
          await updateSettings(peakUpdate);
          settings.bankroll -= po.amount;

          results.push({ market: market.question, action: 'PREORDER_FILLED', tradeId });
        }
      }
      // Cancel expired pre-orders (window ended without fill)
      if (new Date() > new Date(po.window_end)) {
        await updatePreOrderStatus(rowIndex, 'expired');
        results.push({ market: po.slug, action: 'PREORDER_EXPIRED' });
      }
    }

    // ===== PHASE 1: Scan active markets (normal flow) =====
    for (const market of markets) {
      const timeframe = getTimeframeFromMarket(market);

      // Skip if timeframe not in settings
      if (!settings.timeframes.includes(timeframe) && timeframe !== 5 && timeframe !== 15) {
        continue;
      }

      // Skip if entry price too high
      if (market.yesPrice > settings.entry_price_max) {
        await logObservation(market.id, market.question, timeframe, market, signals, 0, 'TIER3', false, '', `Price too high: ${market.yesPrice}`, 0, 0);
        continue;
      }

      // Determine current window context for scorer
      let currentWindowContext: { currentWindowYesPrice?: number; currentWindowMinutesLeft?: number } = {};
      try {
        const currentSlug = getCurrentWindowSlug(timeframe);
        const currentMarket = markets.find(m => m.slug === currentSlug && m.id !== market.id);
        if (currentMarket) {
          currentWindowContext = {
            currentWindowYesPrice: currentMarket.yesPrice,
            currentWindowMinutesLeft: (new Date(currentMarket.endDate).getTime() - Date.now()) / 60000,
          };
        }
      } catch {
        // Current market might not be available — that's fine
      }

      // Score signals with window context
      const { total: score, tier } = scoreSignals(signals, settings, currentWindowContext);

      // Already have open trade on this market?
      const alreadyOpen = openTrades.some(t => t.trade.market_id === market.id);
      if (alreadyOpen) {
        await logObservation(market.id, market.question, timeframe, market, signals, score, tier, false, '', 'Already have open trade',
          currentWindowContext.currentWindowYesPrice || 0, currentWindowContext.currentWindowMinutesLeft || 0);
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
          regime,
          ai_decision: aiDecision,
          ai_confidence: aiConfidence,
          ai_reasoning: aiReasoning,
          exit_reason: '',
          exit_price: 0,
          savings_vs_hold: 0,
          is_maker: false,
          maker_rebate: 0,
        };

        await appendTrade(trade);
        await sendTradeNotification(trade, settings);

        // Update bankroll and peak
        const newBankroll = settings.bankroll - betSize;
        const peakUpdate: Record<string, number | boolean> = { bankroll: newBankroll };
        if (newBankroll > settings.peak_bankroll) {
          peakUpdate.peak_bankroll = newBankroll;
        }
        await updateSettings(peakUpdate);
        settings.bankroll -= betSize;

        await logObservation(market.id, market.question, timeframe, market, signals, score, tier, true, tradeId, '',
          currentWindowContext.currentWindowYesPrice || 0, currentWindowContext.currentWindowMinutesLeft || 0);

        results.push({ market: market.question, action: 'TRADED', tradeId });
      } else {
        const skipReason = tier === 'TIER3'
          ? `Score too low: ${score}`
          : tier === 'TIER2' && !shouldTrade
            ? `AI skipped: ${aiDecision} (${aiConfidence}%)`
            : 'Max trades reached';

        await logObservation(market.id, market.question, timeframe, market, signals, score, tier, false, '', skipReason,
          currentWindowContext.currentWindowYesPrice || 0, currentWindowContext.currentWindowMinutesLeft || 0);
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
  skipReason: string,
  currentWindowYesPrice: number,
  currentWindowMinutesLeft: number,
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
    current_window_yes_price: currentWindowYesPrice,
    current_window_minutes_left: currentWindowMinutesLeft,
  };
  await appendObservation(obs);
}
