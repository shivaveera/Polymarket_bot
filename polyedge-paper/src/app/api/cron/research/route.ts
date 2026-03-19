import { NextRequest, NextResponse } from 'next/server';
import {
  getTradesSince,
  getObservationsSince,
  appendDailyStats,
  getSettings,
} from '@/lib/sheets';
import { DailyStats } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trades = await getTradesSince(yesterday);
    const dayTrades = trades.filter(t => {
      const ts = new Date(t.timestamp);
      return ts >= yesterday && ts < today;
    });

    const observations = await getObservationsSince(yesterday);
    const dayObs = observations.filter(o => {
      const ts = new Date(o.timestamp);
      return ts >= yesterday && ts < today;
    });

    const won = dayTrades.filter(t => t.status === 'won').length;
    const lost = dayTrades.filter(t => t.status === 'lost').length;
    const total = won + lost;
    const winRate = total > 0 ? Math.round((won / total) * 10000) / 100 : 0;

    const pnlGross = dayTrades.reduce((sum, t) => sum + t.pnl_gross, 0);
    const pnlNet = dayTrades.reduce((sum, t) => sum + t.pnl_net, 0);
    const totalFees = dayTrades.reduce((sum, t) => sum + t.taker_fee + t.gas_fee, 0);

    // Base YES rate: how often YES resolved across all observed markets
    const resolvedObs = dayObs.filter(o => o.market_outcome);
    const yesResolved = resolvedObs.filter(o => o.market_outcome === 'YES').length;
    const baseYesRate = resolvedObs.length > 0
      ? Math.round((yesResolved / resolvedObs.length) * 10000) / 100
      : 50;

    const botAlpha = Math.round((winRate - baseYesRate) * 100) / 100;

    // Determine regime from price movement
    const priceChanges = dayTrades.map(t => t.momentum_5m);
    const avgMomentum = priceChanges.length > 0
      ? priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length
      : 0;
    const regime = avgMomentum > 0.1 ? 'bull' : avgMomentum < -0.1 ? 'bear' : 'sideways';

    // Find best signal contribution
    const signalWins: Record<string, number> = {};
    for (const t of dayTrades.filter(tr => tr.status === 'won')) {
      if (t.rsi7 >= 55 && t.rsi7 <= 75) signalWins.rsi7 = (signalWins.rsi7 || 0) + 1;
      if (t.momentum_5m > 0.05) signalWins.momentum5m = (signalWins.momentum5m || 0) + 1;
      if (t.adx >= 20) signalWins.adx = (signalWins.adx || 0) + 1;
      if (t.volume_ratio >= 1.2) signalWins.volumeRatio = (signalWins.volumeRatio || 0) + 1;
    }
    const bestSignal = Object.entries(signalWins).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    // Get bankroll at start/end of day
    const bankrollEnd = dayTrades.length > 0
      ? dayTrades[dayTrades.length - 1].bankroll_after
      : settings.bankroll;
    const bankrollStart = bankrollEnd - pnlNet;

    const stats: DailyStats = {
      date: yesterday.toISOString().split('T')[0],
      trades_total: total,
      trades_won: won,
      trades_lost: lost,
      win_rate: winRate,
      pnl_gross: Math.round(pnlGross * 100) / 100,
      pnl_net: Math.round(pnlNet * 100) / 100,
      total_fees: Math.round(totalFees * 100) / 100,
      bankroll_start: Math.round(bankrollStart * 100) / 100,
      bankroll_end: Math.round(bankrollEnd * 100) / 100,
      base_yes_rate: baseYesRate,
      bot_alpha: botAlpha,
      observations: dayObs.length,
      regime,
      best_signal: bestSignal,
    };

    await appendDailyStats(stats);

    return NextResponse.json({ status: 'ok', stats });
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
