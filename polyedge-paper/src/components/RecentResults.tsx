'use client';

import { Trade } from '@/types';

export function RecentResults({ trades }: { trades: Trade[] }) {
  const resolved = trades.filter(t => t.status === 'won' || t.status === 'lost');

  if (resolved.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">RECENT RESULTS</h3>
        <div className="text-gray-500 text-sm">No resolved trades yet</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">RECENT RESULTS</h3>
      <div className="space-y-1">
        {resolved.slice(0, 10).map((trade) => (
          <div key={trade.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={trade.status === 'won' ? 'text-green-400' : 'text-red-400'}>
                {trade.status === 'won' ? 'Won' : 'Lost'}
              </span>
              <span className={`font-mono ${trade.pnl_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trade.pnl_net >= 0 ? '+' : ''}${trade.pnl_net.toFixed(2)}
              </span>
            </div>
            <span className="text-gray-500 text-xs">
              fee ${trade.taker_fee.toFixed(3)}, gas ${trade.gas_fee.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
