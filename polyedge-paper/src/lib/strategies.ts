import { Settings, Trade, Signals, PolymarketMarket } from '@/types';

/**
 * All 10 strategies from the Strategy Playbook, organized as:
 * - Hard gates (instant SKIP)
 * - Scoring adjustments
 * - Secondary strategies (flash crash, endcycle sniper)
 * - Regime tracking
 */

// ===== STRATEGY F: ADX Hard Gate =====
// ADX <= 25 = instant SKIP. No exceptions.
export function checkAdxHardGate(adx: number): { skip: boolean; reason: string } {
  if (adx <= 25) {
    return { skip: true, reason: 'adx_hard_gate' };
  }
  return { skip: false, reason: '' };
}

// ===== STRATEGY H: Loss Signature Pattern Match =====
// 2 of 3 conditions = SKIP: momentum5m < 0, ADX < 25, BBWidth < 0.50
export function checkLossSignature(signals: Signals): { skip: boolean; reason: string; matchCount: number } {
  let matchCount = 0;
  const matches: string[] = [];

  if (signals.momentum5m < 0) {
    matchCount++;
    matches.push('neg_momentum');
  }
  if (signals.adx < 25) {
    matchCount++;
    matches.push('low_adx');
  }
  if (signals.bbWidth < 0.50) {
    matchCount++;
    matches.push('compressed_bb');
  }

  if (matchCount >= 2) {
    return { skip: true, reason: `loss_signature_match(${matches.join('+')})`, matchCount };
  }
  return { skip: false, reason: '', matchCount };
}

// ===== STRATEGY J: Trade Cooldown =====
// Max 1 trade per window. Enforce minimum time between trades.
export function checkCooldown(params: {
  lastTradeTime: string | null;
  timeframeMinutes: number;
  openTradesForTimeframe: number;
}): { skip: boolean; reason: string } {
  const { lastTradeTime, timeframeMinutes, openTradesForTimeframe } = params;

  // Already have a trade on this timeframe
  if (openTradesForTimeframe > 0) {
    return { skip: true, reason: `cooldown_active_${timeframeMinutes}m` };
  }

  if (lastTradeTime) {
    const secondsSinceLast = (Date.now() - new Date(lastTradeTime).getTime()) / 1000;
    const cooldownSeconds = timeframeMinutes * 60;

    if (secondsSinceLast < cooldownSeconds) {
      return { skip: true, reason: `cooldown_${Math.round(cooldownSeconds - secondsSinceLast)}s_remaining` };
    }
  }

  return { skip: false, reason: '' };
}

// ===== STRATEGY D: Window Delta =====
// THE primary signal. Computes delta from window opening price to current BTC price.
export function computeWindowDelta(params: {
  currentBtcPrice: number;
  windowOpenPrice: number | null;
}): { deltaPct: number; available: boolean } {
  if (!params.windowOpenPrice || params.windowOpenPrice === 0) {
    return { deltaPct: 0, available: false };
  }
  const deltaPct = ((params.currentBtcPrice - params.windowOpenPrice) / params.windowOpenPrice) * 100;
  return { deltaPct, available: true };
}

export function scoreWindowDelta(deltaPct: number): { score: number; skip: boolean; reason: string } {
  // BTC below opening = don't bet YES against clear down
  if (deltaPct < -0.05) {
    return { score: 0, skip: true, reason: `window_delta_negative(${deltaPct.toFixed(3)}%)` };
  }
  if (deltaPct > 0.10) return { score: 15, skip: false, reason: '' }; // near-certain
  if (deltaPct > 0.05) return { score: 10, skip: false, reason: '' }; // strong
  if (deltaPct > 0.02) return { score: 5, skip: false, reason: '' };  // lean
  return { score: 0, skip: false, reason: '' };                        // neutral
}

// ===== STRATEGY G: Momentum Cliff at 0.15% =====
// Phase transition: below 0.15% is coin flip. Above = 96.3% YES rate.
export function scoreMomentumCliff(momentum5m: number): { score: number; label: string } {
  if (momentum5m >= 0.15) {
    return { score: 12, label: 'CLIFF_BULL' };  // near-certain continuation
  }
  if (momentum5m > 0) {
    return { score: 3, label: 'WEAK_BULL' };     // marginal, looks bullish but 47% WR
  }
  return { score: -5, label: 'BEARISH' };           // penalty, but not extreme
}

// ===== STRATEGY C: Streak Reversal =====
// Track last N outcomes. Adjust score based on streaks.
export function scoreStreakReversal(params: {
  recentOutcomes: ('YES' | 'NO')[];
  streakLength: number;
  streakPenalty: number;
  streakBonus: number;
}): { adjustment: number; reason: string } {
  const { recentOutcomes, streakLength, streakPenalty, streakBonus } = params;

  if (recentOutcomes.length < streakLength) {
    return { adjustment: 0, reason: '' };
  }

  const lastN = recentOutcomes.slice(-streakLength);
  const allYes = lastN.every(o => o === 'YES');
  const allNo = lastN.every(o => o === 'NO');
  const yesCount = lastN.filter(o => o === 'YES').length;

  if (allYes) {
    return { adjustment: streakPenalty, reason: `${streakLength}-streak YES exhaustion` };
  }
  if (allNo) {
    return { adjustment: streakBonus, reason: `${streakLength}-streak NO reversal expected` };
  }
  if (yesCount >= streakLength - 1) {
    return { adjustment: Math.round(streakPenalty / 2), reason: `${yesCount}/${streakLength} YES — mild caution` };
  }

  return { adjustment: 0, reason: '' };
}

// ===== STRATEGY E: Chainlink Oracle Check =====
// Compare Binance vs Chainlink BTC price. Divergence = conflict.
export async function fetchChainlinkPrice(): Promise<number | null> {
  try {
    // Use CoinGecko as a secondary price source to approximate Chainlink
    // (Chainlink data streams require authentication)
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.bitcoin?.usd || null;
  } catch {
    return null;
  }
}

export function checkOracleDivergence(params: {
  binancePrice: number;
  oraclePrice: number | null;
  thresholdPct: number;
}): { divergent: boolean; divergencePct: number; penalty: number } {
  if (!params.oraclePrice) {
    return { divergent: false, divergencePct: 0, penalty: 0 };
  }
  const divergencePct = Math.abs(params.binancePrice - params.oraclePrice) / params.binancePrice * 100;
  if (divergencePct > params.thresholdPct) {
    return { divergent: true, divergencePct, penalty: -5 };
  }
  return { divergent: false, divergencePct, penalty: 0 };
}

// ===== STRATEGY I: Regime-Aware Base Rate Tracking =====
// Rolling base rate over last N observations. Adjust thresholds or auto-pause.
export function computeRegimeFromBaseRate(params: {
  recentOutcomes: ('YES' | 'NO')[];
  regimeWindow: number;
  autoPauseBelowBaseRate: number;
}): {
  baseRate: number;
  regime: 'STRONG_BULL' | 'MILD_BULL' | 'NEUTRAL' | 'BEARISH';
  shouldPause: boolean;
  tier1Adjustment: number;
} {
  const { recentOutcomes, regimeWindow, autoPauseBelowBaseRate } = params;

  if (recentOutcomes.length < 10) {
    return { baseRate: 0.80, regime: 'MILD_BULL', shouldPause: false, tier1Adjustment: 0 };
  }

  const window = recentOutcomes.slice(-regimeWindow);
  const yesCount = window.filter(o => o === 'YES').length;
  const baseRate = yesCount / window.length;

  let regime: 'STRONG_BULL' | 'MILD_BULL' | 'NEUTRAL' | 'BEARISH';
  let tier1Adjustment = 0;

  if (baseRate > 0.80) {
    regime = 'STRONG_BULL';
    tier1Adjustment = -5; // lower bar, everything is winning
  } else if (baseRate >= 0.65) {
    regime = 'MILD_BULL';
    tier1Adjustment = 0;   // standard
  } else if (baseRate >= 0.50) {
    regime = 'NEUTRAL';
    tier1Adjustment = 5;   // higher bar, be more selective
  } else {
    regime = 'BEARISH';
    tier1Adjustment = 10;  // maximum selectivity
  }

  const shouldPause = baseRate < autoPauseBelowBaseRate;

  return { baseRate, regime, shouldPause, tier1Adjustment };
}

// ===== STRATEGY B: Flash Crash Buy =====
// Detect sudden YES price drops > threshold in one tick.
export function detectFlashCrash(params: {
  previousYesPrice: number;
  currentYesPrice: number;
  btcMomentum5m: number;
  dropThreshold: number;
  momentumFloor: number;
}): { detected: boolean; reason: string } {
  const { previousYesPrice, currentYesPrice, btcMomentum5m, dropThreshold, momentumFloor } = params;

  if (previousYesPrice <= 0) {
    return { detected: false, reason: '' };
  }

  const drop = previousYesPrice - currentYesPrice;

  // YES price dropped significantly AND BTC momentum hasn't actually crashed
  if (drop > dropThreshold && btcMomentum5m > momentumFloor) {
    return { detected: true, reason: `flash_crash(${previousYesPrice.toFixed(3)}->${currentYesPrice.toFixed(3)})` };
  }

  return { detected: false, reason: '' };
}

// ===== STRATEGY A: Endcycle Sniper =====
// Last 30 seconds of a window, YES > 0.90, score >= 30. Tiny bet, high accuracy.
export function checkEndcycleSniper(params: {
  secondsUntilEnd: number;
  currentYesPrice: number;
  signalScore: number;
  settings: {
    endcycle_sniper_enabled: boolean;
    endcycle_min_price: number;
    endcycle_max_seconds: number;
  };
}): { shouldSnipe: boolean; reason: string } {
  const { secondsUntilEnd, currentYesPrice, signalScore, settings } = params;

  if (!settings.endcycle_sniper_enabled) {
    return { shouldSnipe: false, reason: 'endcycle_disabled' };
  }

  if (secondsUntilEnd > settings.endcycle_max_seconds) {
    return { shouldSnipe: false, reason: 'too_early_for_endcycle' };
  }

  if (secondsUntilEnd < 5) {
    return { shouldSnipe: false, reason: 'too_late_for_endcycle' };
  }

  if (currentYesPrice < settings.endcycle_min_price) {
    return { shouldSnipe: false, reason: `yes_price_too_low(${currentYesPrice})` };
  }

  if (signalScore < 30) {
    return { shouldSnipe: false, reason: `score_too_low_for_snipe(${signalScore})` };
  }

  return { shouldSnipe: true, reason: 'endcycle_conditions_met' };
}

// ===== Utility: Get window open price from candles =====
// Approximate the window opening BTC price from candle data.
export function getWindowOpenPrice(params: {
  candles: { openTime: number; open: number }[];
  windowStartTime: number; // unix ms
}): number | null {
  const { candles, windowStartTime } = params;

  // Find the candle closest to window start time
  let closest: { openTime: number; open: number } | null = null;
  let minDiff = Infinity;

  for (const c of candles) {
    const diff = Math.abs(c.openTime - windowStartTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = c;
    }
  }

  // Only use if within 2 minutes of window start
  if (closest && minDiff < 120000) {
    return closest.open;
  }
  return null;
}

// ===== Combined hard gate check =====
// Returns first failing gate or null if all pass.
export function runHardGates(params: {
  signals: Signals;
  settings: Settings;
  lastTradeTime: string | null;
  timeframeMinutes: number;
  openTradesForTimeframe: number;
  secondsUntilEnd: number;
  regimeBaseRate?: number;
  regimeShouldPause?: boolean;
}): { skip: boolean; reason: string } {
  const { signals, settings, lastTradeTime, timeframeMinutes,
          openTradesForTimeframe, secondsUntilEnd, regimeBaseRate, regimeShouldPause } = params;

  // Gate 1: ADX Hard Gate
  if (settings.adx_hard_gate_enabled) {
    const adxGate = checkAdxHardGate(signals.adx);
    if (adxGate.skip) return adxGate;
  }

  // Gate 2: Cooldown
  if (settings.cooldown_enabled) {
    const cooldown = checkCooldown({ lastTradeTime, timeframeMinutes, openTradesForTimeframe });
    if (cooldown.skip) return cooldown;
  }

  // Gate 3: Loss Signature (skip if ADX gate is enabled — they overlap on ADX < 25)
  if (settings.loss_signature_enabled && !settings.adx_hard_gate_enabled) {
    const lossSig = checkLossSignature(signals);
    if (lossSig.skip) return { skip: true, reason: lossSig.reason };
  } else if (settings.loss_signature_enabled && settings.adx_hard_gate_enabled) {
    // ADX gate already passed, so only check remaining loss signature conditions
    // (negative momentum + compressed BB, since ADX is already > 25)
    if (signals.momentum5m < 0 && signals.bbWidth < 0.50) {
      return { skip: true, reason: 'loss_signature_match(neg_momentum+compressed_bb)' };
    }
  }

  // Gate 4: Regime auto-pause
  if (settings.regime_tracking_enabled && regimeShouldPause) {
    return { skip: true, reason: `regime_pause(base_rate=${(regimeBaseRate || 0).toFixed(2)})` };
  }

  // Gate 5: Absorption detected — institutional activity, skip
  if (signals.absorption) {
    return { skip: true, reason: 'absorption_detected' };
  }

  // Gate 6: Final 60s of window — skip (let endcycle handle it if enabled)
  if (secondsUntilEnd < 60 && !settings.endcycle_sniper_enabled) {
    return { skip: true, reason: 'final_60s_of_window' };
  }

  return { skip: false, reason: '' };
}
