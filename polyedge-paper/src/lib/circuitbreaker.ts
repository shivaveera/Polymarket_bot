import { Trade, CircuitBreakerStatus } from '@/types';

export function checkCircuitBreakerStatus(params: {
  recentTrades: Trade[];
  currentBankroll: number;
  peakBankroll: number;
  settings: {
    circuit_breaker_enabled: boolean;
    max_consecutive_losses: number;
    max_drawdown_pct: number;
  };
}): CircuitBreakerStatus {
  const { recentTrades, currentBankroll, peakBankroll, settings } = params;

  if (!settings.circuit_breaker_enabled) {
    return {
      triggered: false,
      reason: null,
      consecutiveLosses: 0,
      drawdownPct: 0,
      peakBankroll,
    };
  }

  // Count consecutive losses from most recent
  let consecutiveLosses = 0;
  // Iterate from most recent to oldest
  const sorted = [...recentTrades].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const trade of sorted) {
    if (trade.status === 'lost' || trade.status === 'exited_early') {
      consecutiveLosses++;
    } else if (trade.status === 'won') {
      break;
    }
    // Skip 'open' trades
  }

  // Calculate drawdown from peak
  const effectivePeak = Math.max(
    peakBankroll,
    ...recentTrades
      .map(t => t.bankroll_after)
      .filter(b => b > 0),
    currentBankroll
  );
  const drawdownPct = effectivePeak > 0
    ? ((effectivePeak - currentBankroll) / effectivePeak) * 100
    : 0;

  // Check triggers
  if (consecutiveLosses >= settings.max_consecutive_losses) {
    return {
      triggered: true,
      reason: `${consecutiveLosses} consecutive losses (max: ${settings.max_consecutive_losses})`,
      consecutiveLosses,
      drawdownPct,
      peakBankroll: effectivePeak,
    };
  }

  if (drawdownPct >= settings.max_drawdown_pct) {
    return {
      triggered: true,
      reason: `Drawdown ${drawdownPct.toFixed(1)}% from peak $${effectivePeak.toFixed(2)} (max: ${settings.max_drawdown_pct}%)`,
      consecutiveLosses,
      drawdownPct,
      peakBankroll: effectivePeak,
    };
  }

  return {
    triggered: false,
    reason: null,
    consecutiveLosses,
    drawdownPct,
    peakBankroll: effectivePeak,
  };
}
