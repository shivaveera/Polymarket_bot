'use client';

export function BankrollCard({ bankroll, todayPnl }: { bankroll: number; todayPnl: number }) {
  return (
    <div className="card">
      <div className="text-sm text-gray-400">Bankroll</div>
      <div className="text-2xl font-bold">${bankroll.toFixed(2)}</div>
      <div className={`text-sm ${todayPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {todayPnl >= 0 ? '+' : ''}{todayPnl.toFixed(2)} today
      </div>
    </div>
  );
}
