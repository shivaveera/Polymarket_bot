'use client';

import { useState, useEffect } from 'react';
import { TradeHistory } from '@/components/TradeHistory';
import { Trade } from '@/types';

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trade/history?limit=100')
      .then(r => r.json())
      .then(data => {
        setTrades((data.trades || []).reverse());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Trade History</h1>
      {loading ? (
        <div className="text-gray-500">Loading trades...</div>
      ) : (
        <TradeHistory trades={trades} />
      )}
    </div>
  );
}
