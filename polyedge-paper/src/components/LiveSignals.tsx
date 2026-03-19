'use client';

interface SignalData {
  btcPrice: number;
  rsi7: number;
  momentum1m: number;
  momentum5m: number;
  adx: number;
  volumeRatio: number;
  bbWidth: number;
  vwapDistance: number;
  chop: boolean;
  score: number;
  tier: string;
}

export function LiveSignals({ signals }: { signals: SignalData | null }) {
  if (!signals) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">LIVE SIGNALS</h3>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">LIVE SIGNALS</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-gray-400">BTC:</span>{' '}
          <span className="font-mono">${signals.btcPrice.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-400">RSI(7):</span>{' '}
          <span className={`font-mono ${signals.rsi7 > 70 ? 'text-yellow-400' : signals.rsi7 > 55 ? 'text-green-400' : ''}`}>
            {signals.rsi7}
          </span>
        </div>
        <div>
          <span className="text-gray-400">5m:</span>{' '}
          <span className={`font-mono ${signals.momentum5m > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {signals.momentum5m > 0 ? '+' : ''}{signals.momentum5m}%
          </span>
        </div>
        <div>
          <span className="text-gray-400">1m:</span>{' '}
          <span className={`font-mono ${signals.momentum1m > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {signals.momentum1m > 0 ? '+' : ''}{signals.momentum1m}%
          </span>
        </div>
        <div>
          <span className="text-gray-400">ADX:</span>{' '}
          <span className="font-mono">{signals.adx}</span>
        </div>
        <div>
          <span className="text-gray-400">Vol:</span>{' '}
          <span className="font-mono">{signals.volumeRatio}x</span>
        </div>
        <div>
          <span className="text-gray-400">Score:</span>{' '}
          <span className="font-mono font-bold">{signals.score}/35</span>
        </div>
        <div>
          <span className="text-gray-400">Tier:</span>{' '}
          <span className={`font-mono font-bold ${
            signals.tier === 'TIER1' ? 'text-green-400' :
            signals.tier === 'TIER2' ? 'text-yellow-400' : 'text-gray-500'
          }`}>
            {signals.tier}
          </span>
          {signals.chop && <span className="ml-1 text-yellow-400">(CHOP)</span>}
        </div>
      </div>
    </div>
  );
}
