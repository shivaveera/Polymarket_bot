'use client';

import { Trade } from '@/types';

export function ActiveTrades({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">ACTIVE TRADES</h3>
        <div className="text-gray-500 text-sm">No open trades</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">ACTIVE TRADES</h3>
      <div className="space-y-2">
        {trades.map((trade) => {
          const endTime = new Date(trade.end_time);
          const now = new Date();
          const minutesLeft = Math.max(0, Math.round((endTime.getTime() - now.getTime()) / 60000));
          const minStr = `${Math.floor(minutesLeft / 60)}:${(minutesLeft % 60).toString().padStart(2, '0')}`;

          return (
            <div key={trade.id} className="flex items-center justify-between text-sm bg-[#111] rounded px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">YES</span>
                <span className="text-gray-300">@ ${trade.entry_price.toFixed(3)}</span>
                <span className="text-gray-500">${trade.amount_usd.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{trade.timeframe_min}m</span>
                <span className="font-mono text-yellow-400">{minStr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
