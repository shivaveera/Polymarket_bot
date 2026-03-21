import { Signals, Settings } from '@/types';
import {
  scoreWindowDelta,
  scoreMomentumCliff,
  scoreStreakReversal,
  checkOracleDivergence,
} from './strategies';

export interface ScoreBreakdown {
  total: number;
  tier: 'TIER1' | 'TIER2' | 'TIER3';
  components: Record<string, number>;
  conflicts: string[];
  confirmations: string[];
  windowDeltaSkip: boolean;
  windowDeltaSkipReason: string;
}

export interface ScorerContext {
  // Current window context (Feature 3 from previous commit)
  currentWindowYesPrice?: number;
  currentWindowMinutesLeft?: number;
  // Strategy D: Window Delta
  windowDeltaPct?: number;
  windowDeltaAvailable?: boolean;
  // Strategy C: Streak Reversal
  recentOutcomes?: ('YES' | 'NO')[];
  // Strategy E: Oracle Check
  oraclePrice?: number | null;
}

export function scoreSignals(
  signals: Signals,
  settings: Settings,
  context?: ScorerContext,
): ScoreBreakdown {
  const components: Record<string, number> = {};
  const conflicts: string[] = [];
  const confirmations: string[] = [];
  let total = 0;
  let windowDeltaSkip = false;
  let windowDeltaSkipReason = '';

  // ===== STRATEGY D: Window Delta (THE primary signal) =====
  if (settings.window_delta_enabled && context?.windowDeltaAvailable && context.windowDeltaPct !== undefined) {
    const wd = scoreWindowDelta(context.windowDeltaPct);
    if (wd.skip) {
      windowDeltaSkip = true;
      windowDeltaSkipReason = wd.reason;
    }
    components.windowDelta = wd.score;
    total += wd.score;
    if (wd.score >= 10) {
      confirmations.push(`Window delta ${context.windowDeltaPct.toFixed(3)}% — strong YES signal`);
    }
  }

  // ===== STRATEGY G: Momentum Cliff (replaces old 5m momentum scoring) =====
  if (settings.momentum_cliff_enabled) {
    // Reduce weight when window delta is also enabled (they're correlated)
    const mc = scoreMomentumCliff(signals.momentum5m);
    const mcScore = settings.window_delta_enabled ? Math.round(mc.score * 0.5) : mc.score;
    components.momentumCliff = mcScore;
    total += mcScore;
    if (mc.label === 'CLIFF_BULL') {
      confirmations.push(`Momentum cliff at ${signals.momentum5m.toFixed(3)}% — 96% YES zone`);
    } else if (mc.label === 'BEARISH') {
      conflicts.push(`Negative momentum ${signals.momentum5m.toFixed(3)}% — BEARISH`);
    }
  } else {
    // Fallback: original 5m momentum scoring
    if (signals.momentum5m > 0.05) {
      components.momentum5m = Math.min(7, Math.round(signals.momentum5m / 0.05) * 2);
    } else if (signals.momentum5m > 0) {
      components.momentum5m = 2;
    } else {
      components.momentum5m = 0;
    }
    total += components.momentum5m || 0;
  }

  // RSI(7) momentum signal: 0-7 points
  if (signals.rsi7 >= 55 && signals.rsi7 <= 75) {
    const rsiScore = Math.round(((signals.rsi7 - 55) / 20) * 7);
    components.rsi7 = Math.min(rsiScore, 7);
  } else if (signals.rsi7 > 75) {
    components.rsi7 = Math.max(0, 7 - Math.round((signals.rsi7 - 75) / 5));
  } else if (signals.rsi7 >= 45 && signals.rsi7 < 55) {
    components.rsi7 = 2;
  } else {
    components.rsi7 = 0;
  }
  total += components.rsi7;

  // 1m Momentum (confirm direction): 0-4 points
  if (signals.momentum1m > 0.02) {
    components.momentum1m = Math.min(4, Math.round(signals.momentum1m / 0.02) * 2);
  } else if (signals.momentum1m > 0) {
    components.momentum1m = 1;
  } else {
    components.momentum1m = 0;
  }
  total += components.momentum1m;

  // ADX (trend strength): 0-5 points
  // Skip ADX scoring when hard gate is enabled (all trades already have ADX > 25)
  if (!settings.adx_hard_gate_enabled) {
    if (signals.adx >= 20 && signals.adx <= 50) {
      components.adx = Math.min(5, Math.round((signals.adx - 15) / 7));
    } else if (signals.adx > 50) {
      components.adx = 3;
    } else {
      components.adx = 0;
    }
    total += components.adx;
  } else {
    components.adx = 0;
  }

  // Volume ratio: 0-4 points
  if (signals.volumeRatio >= 1.2) {
    components.volumeRatio = Math.min(4, Math.round((signals.volumeRatio - 1) * 5));
  } else {
    components.volumeRatio = 0;
  }
  total += components.volumeRatio;

  // Bollinger width (volatility): 0-3 points
  if (signals.bbWidth >= 0.3 && signals.bbWidth <= 2) {
    components.bbWidth = Math.min(3, Math.round(signals.bbWidth * 2));
  } else {
    components.bbWidth = 0;
  }
  total += components.bbWidth;

  // VWAP distance: 0-3 points
  if (signals.vwapDistance > 0 && signals.vwapDistance < 0.5) {
    components.vwapDistance = Math.min(3, Math.round(signals.vwapDistance * 6));
  } else {
    components.vwapDistance = 0;
  }
  total += components.vwapDistance;

  // Absorption penalty: detected absorption means institutional activity, skip signal
  components.absorption = signals.absorption ? -5 : 0;
  total += components.absorption;

  // Chop penalty: -5 points
  if (signals.chop) {
    components.chop = -5;
    total += -5;
  } else {
    components.chop = 0;
  }

  // ===== STRATEGY C: Streak Reversal =====
  if (settings.streak_tracking_enabled && context?.recentOutcomes && context.recentOutcomes.length > 0) {
    const streak = scoreStreakReversal({
      recentOutcomes: context.recentOutcomes,
      streakLength: settings.streak_length,
      streakPenalty: settings.streak_penalty,
      streakBonus: settings.streak_bonus,
    });
    if (streak.adjustment !== 0) {
      components.streakReversal = streak.adjustment;
      total += streak.adjustment;
      if (streak.adjustment < 0) {
        conflicts.push(streak.reason);
      } else {
        confirmations.push(streak.reason);
      }
    }
  }

  // ===== STRATEGY E: Oracle Check =====
  if (settings.oracle_check_enabled && context?.oraclePrice) {
    const oracle = checkOracleDivergence({
      binancePrice: signals.btcPrice,
      oraclePrice: context.oraclePrice,
      thresholdPct: settings.oracle_divergence_threshold,
    });
    if (oracle.divergent) {
      components.oracleDivergence = oracle.penalty;
      total += oracle.penalty;
      conflicts.push(`Binance/Oracle divergence ${oracle.divergencePct.toFixed(3)}%`);
    }
  }

  // ===== Current window signal adjustment (from previous commit) =====
  if (context?.currentWindowYesPrice !== undefined &&
      context?.currentWindowMinutesLeft !== undefined) {

    const cwYes = context.currentWindowYesPrice;
    const cwMinLeft = context.currentWindowMinutesLeft;

    if (cwYes > 0.95) {
      components.currentWindowSignal = -5;
      total += -5;
      conflicts.push(`Current window near-certain YES (${(cwYes * 100).toFixed(0)}%) — strong mean reversion risk`);
    } else if (cwYes > 0.85 && cwMinLeft < 5) {
      components.currentWindowSignal = -3;
      total += -3;
      conflicts.push(`Current window YES at ${(cwYes * 100).toFixed(0)}% — mean reversion risk`);
    } else if (cwYes < 0.15 && cwMinLeft < 5) {
      components.currentWindowSignal = 1;
      total += 1;
      confirmations.push(`Current window bearish — bounce potential`);
    } else {
      components.currentWindowSignal = 0;
    }
  }

  total = Math.max(0, Math.min(50, total));

  // Determine tier (with regime adjustment applied externally in tick route)
  let tier: 'TIER1' | 'TIER2' | 'TIER3';
  if (total >= settings.tier1_threshold) {
    tier = 'TIER1';
  } else if (total >= settings.tier2_threshold) {
    tier = 'TIER2';
  } else {
    tier = 'TIER3';
  }

  return { total, tier, components, conflicts, confirmations, windowDeltaSkip, windowDeltaSkipReason };
}
