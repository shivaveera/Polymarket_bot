'use client';

import { useState, useEffect } from 'react';
import { DailyStats } from '@/types';
import { DailyChart } from '@/components/DailyChart';

export default function ResearchPage() {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trade/stats')
      .then(r => r.json())
      .then(data => {
        setStats(data.dailyStats || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading research data...</div>;

  const totalDays = stats.length;
  const profitDays = stats.filter(s => s.pnl_net > 0).length;
  const avgPnl = totalDays > 0 ? stats.reduce((sum, s) => sum + s.pnl_net, 0) / totalDays : 0;
  const avgWinRate = totalDays > 0 ? stats.reduce((sum, s) => sum + s.win_rate, 0) / totalDays : 0;
  const avgAlpha = totalDays > 0 ? stats.reduce((sum, s) => sum + s.bot_alpha, 0) / totalDays : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Research & Analysis</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-sm text-gray-400">Days Tracked</div>
          <div className="text-2xl font-bold">{totalDays}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400">Profitable Days</div>
          <div className="text-2xl font-bold text-green-400">{profitDays}</div>
          <div className="text-sm text-gray-400">
            {totalDays > 0 ? Math.round((profitDays / totalDays) * 100) : 0}%
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400">Avg Daily PnL</div>
          <div className={`text-2xl font-bold ${avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${avgPnl.toFixed(2)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400">Avg Alpha</div>
          <div className={`text-2xl font-bold ${avgAlpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {avgAlpha.toFixed(1)}%
          </div>
        </div>
      </div>

      <DailyChart stats={stats} />

      {/* Daily breakdown table */}
      {stats.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">DAILY BREAKDOWN</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-[#2a2a2a]">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Trades</th>
                <th className="pb-2 pr-3">W/L</th>
                <th className="pb-2 pr-3">Win %</th>
                <th className="pb-2 pr-3">PnL</th>
                <th className="pb-2 pr-3">Fees</th>
                <th className="pb-2 pr-3">Alpha</th>
                <th className="pb-2">Regime</th>
              </tr>
            </thead>
            <tbody>
              {stats.slice().reverse().map((day) => (
                <tr key={day.date} className="border-b border-[#1a1a1a]">
                  <td className="py-2 pr-3">{day.date}</td>
                  <td className="py-2 pr-3">{day.trades_total}</td>
                  <td className="py-2 pr-3">{day.trades_won}/{day.trades_lost}</td>
                  <td className="py-2 pr-3">{day.win_rate}%</td>
                  <td className={`py-2 pr-3 font-mono ${day.pnl_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${day.pnl_net.toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 text-gray-500">${day.total_fees.toFixed(2)}</td>
                  <td className={`py-2 pr-3 ${day.bot_alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {day.bot_alpha}%
                  </td>
                  <td className="py-2">{day.regime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">NOTES</h3>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>Daily research runs via /api/cron/research (see vercel.json for schedule)</li>
          <li>Alpha = Bot Win Rate - Base YES Resolution Rate</li>
          <li>Positive alpha means the bot is picking better than random</li>
          <li>Regime is estimated from average 5m momentum of traded periods</li>
        </ul>
      </div>
    </div>
  );
}
