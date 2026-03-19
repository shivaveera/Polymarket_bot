'use client';

export function WinRateCard({ winRate, totalTrades, alpha }: { winRate: number; totalTrades: number; alpha?: number }) {
  return (
    <div className="card">
      <div className="text-sm text-gray-400">Win Rate</div>
      <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
      <div className="text-sm text-gray-400">
        {totalTrades} trades
        {alpha !== undefined && (
          <span className={alpha >= 0 ? 'text-green-400' : 'text-red-400'}>
            {' '}({alpha >= 0 ? '+' : ''}{alpha.toFixed(1)}% alpha)
          </span>
        )}
      </div>
    </div>
  );
}
