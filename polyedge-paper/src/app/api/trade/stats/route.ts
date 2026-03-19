import { NextResponse } from 'next/server';
import { getAllTrades, getOpenTrades, getDailyStats, getSettings } from '@/lib/sheets';

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
    const lost = closedTrades.filter(t => t.status === 'lost').length;
    const total = won + lost;
    const winRate = total > 0 ? Math.round((won / total) * 10000) / 100 : 0;

    const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl_net, 0);
    const totalFees = closedTrades.reduce((sum, t) => sum + t.taker_fee + t.gas_fee, 0);

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrades = closedTrades.filter(t => new Date(t.timestamp) >= today);
    const todayPnl = todayTrades.reduce((sum, t) => sum + t.pnl_net, 0);
    const todayFees = todayTrades.reduce((sum, t) => sum + t.taker_fee + t.gas_fee, 0);
    const todayWon = todayTrades.filter(t => t.status === 'won').length;
    const todayTotal = todayTrades.length;

    return NextResponse.json({
      bankroll: settings.bankroll,
      tradingEnabled: settings.trading_enabled,
      openTrades: openTradesData.map(t => t.trade),
      allTime: {
        totalTrades: total,
        won,
        lost,
        winRate,
        pnl: Math.round(totalPnl * 100) / 100,
        fees: Math.round(totalFees * 100) / 100,
      },
      today: {
        trades: todayTotal,
        won: todayWon,
        pnl: Math.round(todayPnl * 100) / 100,
        fees: Math.round(todayFees * 100) / 100,
      },
      dailyStats,
      recentTrades: allTrades.slice(-20).reverse(),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
