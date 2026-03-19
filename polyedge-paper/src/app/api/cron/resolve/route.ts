import { NextRequest, NextResponse } from 'next/server';
import { checkMarketResolution } from '@/lib/polymarket';
import { simulateResolution } from '@/lib/simulator';
import { getSettings, getOpenTrades, updateTradeResolution, updateSettings } from '@/lib/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    const openTrades = await getOpenTrades();

    if (openTrades.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'No open trades' });
    }

    const results: { tradeId: string; market: string; status: string; pnl?: number }[] = [];
    let bankroll = settings.bankroll;

    for (const { trade, rowIndex } of openTrades) {
      // Check if market has resolved
      const resolution = await checkMarketResolution(trade.market_id);

      // Also check if end_time has passed (force resolve)
      const endTime = new Date(trade.end_time);
      const isExpired = endTime <= new Date();

      if (!resolution.resolved && !isExpired) {
        results.push({ tradeId: trade.id, market: trade.question, status: 'still_open' });
        continue;
      }

      // If expired but no resolution data, check one more time with a delay
      if (isExpired && !resolution.resolved) {
        // Mark as expired — we'll try again next tick
        // If expired by more than 5 minutes, force-resolve based on last known state
        const minutesPastEnd = (Date.now() - endTime.getTime()) / (1000 * 60);
        if (minutesPastEnd < 5) {
          results.push({ tradeId: trade.id, market: trade.question, status: 'awaiting_resolution' });
          continue;
        }
      }

      // Determine outcome
      const outcome = resolution.outcome || 'NO'; // Default to NO if can't determine

      // Simulate PnL
      const sim = simulateResolution({
        entryPrice: trade.entry_price,
        betAmount: trade.amount_usd,
        outcome,
        settings,
      });

      // Update bankroll: add back bet amount + net PnL
      bankroll += trade.amount_usd + sim.pnlNet;

      await updateTradeResolution(rowIndex, {
        status: outcome === 'YES' ? 'won' : 'lost',
        resolution: outcome,
        close_price: sim.closePrice,
        pnl_gross: sim.pnlGross,
        taker_fee: sim.takerFee,
        gas_fee: sim.gasFee,
        pnl_net: sim.pnlNet,
        bankroll_after: Math.round(bankroll * 100) / 100,
      });

      results.push({
        tradeId: trade.id,
        market: trade.question,
        status: outcome === 'YES' ? 'won' : 'lost',
        pnl: sim.pnlNet,
      });
    }

    // Update bankroll in settings
    await updateSettings({ bankroll: Math.round(bankroll * 100) / 100 });

    return NextResponse.json({
      status: 'ok',
      resolved: results.filter(r => r.status === 'won' || r.status === 'lost').length,
      results,
    });
  } catch (error) {
    console.error('Resolve error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
