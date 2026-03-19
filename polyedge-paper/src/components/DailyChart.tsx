'use client';

import { DailyStats } from '@/types';

export function DailyChart({ stats }: { stats: DailyStats[] }) {
  if (stats.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">DAILY PnL</h3>
        <div className="text-gray-500 text-sm">No daily stats yet</div>
      </div>
    );
  }

  const maxPnl = Math.max(...stats.map(s => Math.abs(s.pnl_net)), 1);

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">DAILY PnL</h3>
      <div className="flex items-end gap-1 h-32">
        {stats.slice(-14).map((day, i) => {
          const height = Math.abs(day.pnl_net) / maxPnl * 100;
          const isPositive = day.pnl_net >= 0;
          return (
            <div key={i} className="flex flex-col items-center flex-1" title={`${day.date}: $${day.pnl_net.toFixed(2)}`}>
              <div className="w-full flex flex-col justify-end h-24">
                <div
                  className={`w-full rounded-sm ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {day.date.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
