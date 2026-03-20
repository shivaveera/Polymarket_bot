'use client';

import { Trade } from '@/types';

export function RecentResults({ trades }: { trades: Trade[] }) {
  const resolved = trades.filter(t => t.status === 'won' || t.status === 'lost' || t.status === 'exited_early');

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
              {trade.status === 'exited_early' ? (
                <span className="text-yellow-400">Exited</span>
              ) : (
                <span className={trade.status === 'won' ? 'text-green-400' : 'text-red-400'}>
                  {trade.status === 'won' ? 'Won' : 'Lost'}
                </span>
              )}
              <span className={`font-mono ${trade.pnl_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trade.pnl_net >= 0 ? '+' : ''}${trade.pnl_net.toFixed(2)}
              </span>
              {trade.status === 'exited_early' && trade.exit_price > 0 && (
                <span className="text-yellow-400 text-xs">
                  @ ${trade.exit_price.toFixed(2)}
                </span>
              )}
              {trade.savings_vs_hold > 0 && (
                <span className="bg-green-900/50 text-green-300 text-xs px-1.5 py-0.5 rounded">
                  Saved ${trade.savings_vs_hold.toFixed(2)}
                </span>
              )}
              {trade.is_maker && (
                <span className="bg-blue-900/50 text-blue-300 text-xs px-1.5 py-0.5 rounded">
                  Maker
                </span>
              )}
            </div>
            <span className="text-gray-500 text-xs">
              fee ${trade.taker_fee.toFixed(3)}, gas ${trade.gas_fee.toFixed(3)}
              {trade.maker_rebate > 0 && `, rebate +$${trade.maker_rebate.toFixed(4)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
