'use client';

import { useState, useEffect, useCallback } from 'react';
import { BankrollCard } from './BankrollCard';
import { WinRateCard } from './WinRateCard';
import { LiveSignals } from './LiveSignals';
import { ActiveTrades } from './ActiveTrades';
import { RecentResults } from './RecentResults';
import { BotControls } from './BotControls';
import { DailyChart } from './DailyChart';

interface StatsData {
  bankroll: number;
  tradingEnabled: boolean;
  openTrades: Array<{
    id: string;
    timestamp: string;
    market_id: string;
    question: string;
    slug: string;
    side: 'YES';
    entry_price: number;
    timeframe_min: number;
    end_time: string;
    amount_usd: number;
    contracts: number;
    tier: string;
    confidence_score: number;
    status: 'open' | 'won' | 'lost' | 'exited_early';
    resolution: string;
    close_price: number;
    pnl_gross: number;
    taker_fee: number;
    gas_fee: number;
    pnl_net: number;
    bankroll_after: number;
    btc_price: number;
    rsi7: number;
    momentum_5m: number;
    adx: number;
    volume_ratio: number;
    chop: boolean;
    regime: string;
    ai_decision: string;
    ai_confidence: number;
    ai_reasoning: string;
    exit_reason: string;
    exit_price: number;
    savings_vs_hold: number;
    is_maker: boolean;
    maker_rebate: number;
  }>;
  allTime: {
    totalTrades: number;
    won: number;
    lost: number;
    earlyExits: number;
    winRate: number;
    pnl: number;
    fees: number;
    savings: number;
  };
  today: {
    trades: number;
    won: number;
    pnl: number;
    fees: number;
  };
  dailyStats: Array<{
    date: string;
    pnl_net: number;
    trades_total: number;
    trades_won: number;
    trades_lost: number;
    win_rate: number;
    pnl_gross: number;
    total_fees: number;
    bankroll_start: number;
    bankroll_end: number;
    base_yes_rate: number;
    bot_alpha: number;
    observations: number;
    regime: string;
    best_signal: string;
  }>;
  recentTrades: Array<{
    id: string;
    timestamp: string;
    market_id: string;
    question: string;
    slug: string;
    side: 'YES';
    entry_price: number;
    timeframe_min: number;
    end_time: string;
    amount_usd: number;
    contracts: number;
    tier: string;
    confidence_score: number;
    status: 'open' | 'won' | 'lost' | 'exited_early';
    resolution: string;
    close_price: number;
    pnl_gross: number;
    taker_fee: number;
    gas_fee: number;
    pnl_net: number;
    bankroll_after: number;
    btc_price: number;
    rsi7: number;
    momentum_5m: number;
    adx: number;
    volume_ratio: number;
    chop: boolean;
    regime: string;
    ai_decision: string;
    ai_confidence: number;
    ai_reasoning: string;
    exit_reason: string;
    exit_price: number;
    savings_vs_hold: number;
    is_maker: boolean;
    maker_rebate: number;
  }>;
  circuitBreaker: {
    triggered: boolean;
    reason: string | null;
    consecutiveLosses: number;
    drawdownPct: number;
    peakBankroll: number;
  };
}

export function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/trade/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStats]);

  async function toggleTrading(enabled: boolean) {
    await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trading_enabled: enabled }),
    });
    fetchStats();
  }

  if (error && !stats) {
    return (
      <div className="card text-red-400">
        Failed to load stats: {error}
        <br />
        <span className="text-sm text-gray-400">Make sure Google Sheets is configured.</span>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-gray-500">Loading dashboard...</div>;
  }

  // Build signal data from most recent trade (approximation for live view)
  const lastTrade = stats.recentTrades[0];
  const signalData = lastTrade ? {
    btcPrice: lastTrade.btc_price,
    rsi7: lastTrade.rsi7,
    momentum1m: 0,
    momentum5m: lastTrade.momentum_5m,
    adx: lastTrade.adx,
    volumeRatio: lastTrade.volume_ratio,
    bbWidth: 0,
    vwapDistance: 0,
    chop: lastTrade.chop,
    score: lastTrade.confidence_score,
    tier: lastTrade.tier,
  } : null;

  return (
    <div className="space-y-4">
      {/* Circuit Breaker Banner */}
      {stats.circuitBreaker?.triggered && (
        <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          <div className="font-bold text-red-100">TRADING PAUSED</div>
          <div className="text-sm mt-1">{stats.circuitBreaker.reason}</div>
          <div className="text-xs text-red-300 mt-1">
            Reset trading in Settings to resume.
          </div>
        </div>
      )}

      {/* Circuit Breaker Status Badges */}
      {stats.circuitBreaker && !stats.circuitBreaker.triggered && (
        <div className="flex gap-2">
          {stats.circuitBreaker.consecutiveLosses > 0 && (
            <span className={`text-xs px-2 py-1 rounded ${
              stats.circuitBreaker.consecutiveLosses >= 2
                ? 'bg-yellow-900/50 text-yellow-300'
                : 'bg-gray-800 text-gray-400'
            }`}>
              Loss streak: {stats.circuitBreaker.consecutiveLosses}
            </span>
          )}
          {stats.circuitBreaker.drawdownPct > 0 && (
            <span className={`text-xs px-2 py-1 rounded ${
              stats.circuitBreaker.drawdownPct >= 10
                ? 'bg-yellow-900/50 text-yellow-300'
                : 'bg-gray-800 text-gray-400'
            }`}>
              Drawdown: {stats.circuitBreaker.drawdownPct}%
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <BotControls enabled={stats.tradingEnabled} onToggle={toggleTrading} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BankrollCard bankroll={stats.bankroll} todayPnl={stats.today.pnl} />
        <WinRateCard winRate={stats.allTime.winRate} totalTrades={stats.allTime.totalTrades} />
        <div className="card">
          <div className="text-sm text-gray-400">Today</div>
          <div className="text-2xl font-bold">{stats.today.trades}</div>
          <div className="text-sm text-gray-400">trades</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400">Fees Today</div>
          <div className="text-2xl font-bold">${stats.today.fees.toFixed(2)}</div>
          <div className="text-sm text-gray-400">total</div>
        </div>
      </div>

      {/* Early Exit / Savings Stats */}
      {(stats.allTime.earlyExits > 0 || stats.allTime.savings > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="text-sm text-gray-400">Early Exits</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.allTime.earlyExits}</div>
            <div className="text-sm text-gray-400">trades exited early</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Saved by Exit</div>
            <div className="text-2xl font-bold text-green-400">${stats.allTime.savings.toFixed(2)}</div>
            <div className="text-sm text-gray-400">vs holding to resolution</div>
          </div>
        </div>
      )}

      <LiveSignals signals={signalData} />
      <ActiveTrades trades={stats.openTrades} />
      <RecentResults trades={stats.recentTrades} />
      <DailyChart stats={stats.dailyStats} />
    </div>
  );
}
