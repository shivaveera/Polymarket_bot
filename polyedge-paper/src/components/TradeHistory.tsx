'use client';

import { Trade } from '@/types';

export function TradeHistory({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return <div className="text-gray-500">No trades yet</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-[#2a2a2a]">
            <th className="pb-2 pr-3">Time</th>
            <th className="pb-2 pr-3">Side</th>
            <th className="pb-2 pr-3">Price</th>
            <th className="pb-2 pr-3">Amount</th>
            <th className="pb-2 pr-3">Tier</th>
            <th className="pb-2 pr-3">Score</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2 pr-3">PnL</th>
            <th className="pb-2">Fees</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
              <td className="py-2 pr-3 text-gray-400 whitespace-nowrap">
                {new Date(trade.timestamp).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td className="py-2 pr-3 text-blue-400">YES</td>
              <td className="py-2 pr-3 font-mono">${trade.entry_price.toFixed(3)}</td>
              <td className="py-2 pr-3 font-mono">${trade.amount_usd.toFixed(2)}</td>
              <td className="py-2 pr-3">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  trade.tier === 'TIER1' ? 'bg-green-900 text-green-300' :
                  trade.tier === 'TIER2' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {trade.tier}
                </span>
              </td>
              <td className="py-2 pr-3 font-mono">{trade.confidence_score}</td>
              <td className="py-2 pr-3">
                <span className={
                  trade.status === 'won' ? 'text-green-400' :
                  trade.status === 'lost' ? 'text-red-400' :
                  'text-yellow-400'
                }>
                  {trade.status}
                </span>
              </td>
              <td className={`py-2 pr-3 font-mono ${trade.pnl_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trade.status !== 'open' ? `${trade.pnl_net >= 0 ? '+' : ''}$${trade.pnl_net.toFixed(2)}` : '-'}
              </td>
              <td className="py-2 text-gray-500 font-mono">
                {trade.status !== 'open' ? `$${(trade.taker_fee + trade.gas_fee).toFixed(3)}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
