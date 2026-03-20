import { NextResponse } from 'next/server';
import { getAllTrades, getOpenTrades, getDailyStats, getSettings } from '@/lib/sheets';
import { checkCircuitBreakerStatus } from '@/lib/circuitbreaker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [settings, allTrades, openTradesData, dailyStats] = await Promise.all([
      getSettings(),
      getAllTrades(),
      getOpenTrades(),
      getDailyStats(),
    ]);

    const closedTrades = allTrades.filter(t => t.status !== 'open');
    const won = closedTrades.filter(t => t.status === 'won').length;
    const lost = closedTrades.filter(t => t.status === 'lost' || t.status === 'exited_early').length;
    const earlyExits = closedTrades.filter(t => t.status === 'exited_early').length;
    const total = won + lost;
    const winRate = total > 0 ? Math.round((won / total) * 10000) / 100 : 0;

    const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl_net, 0);
    const totalFees = closedTrades.reduce((sum, t) => sum + t.taker_fee + t.gas_fee, 0);
    const totalSavings = closedTrades.reduce((sum, t) => sum + (t.savings_vs_hold || 0), 0);

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrades = closedTrades.filter(t => new Date(t.timestamp) >= today);
    const todayPnl = todayTrades.reduce((sum, t) => sum + t.pnl_net, 0);
    const todayFees = todayTrades.reduce((sum, t) => sum + t.taker_fee + t.gas_fee, 0);
    const todayWon = todayTrades.filter(t => t.status === 'won').length;
    const todayTotal = todayTrades.length;

    // Circuit breaker status
    const recentForBreaker = allTrades.slice(-20);
    const cbStatus = checkCircuitBreakerStatus({
      recentTrades: recentForBreaker,
      currentBankroll: settings.bankroll,
      peakBankroll: settings.peak_bankroll,
      settings,
    });

    return NextResponse.json({
      bankroll: settings.bankroll,
      tradingEnabled: settings.trading_enabled,
      openTrades: openTradesData.map(t => t.trade),
      allTime: {
        totalTrades: total,
        won,
        lost,
        earlyExits,
        winRate,
        pnl: Math.round(totalPnl * 100) / 100,
        fees: Math.round(totalFees * 100) / 100,
        savings: Math.round(totalSavings * 100) / 100,
      },
      today: {
        trades: todayTotal,
        won: todayWon,
        pnl: Math.round(todayPnl * 100) / 100,
        fees: Math.round(todayFees * 100) / 100,
      },
      dailyStats,
      recentTrades: allTrades.slice(-20).reverse(),
      circuitBreaker: {
        triggered: cbStatus.triggered,
        reason: cbStatus.reason,
        consecutiveLosses: cbStatus.consecutiveLosses,
        drawdownPct: Math.round(cbStatus.drawdownPct * 10) / 10,
        peakBankroll: cbStatus.peakBankroll,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
