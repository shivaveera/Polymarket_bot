import { Signals, Settings } from '@/types';

export interface ScoreBreakdown {
  total: number;
  tier: 'TIER1' | 'TIER2' | 'TIER3';
  components: Record<string, number>;
}

export function scoreSignals(signals: Signals, settings: Settings): ScoreBreakdown {
  const components: Record<string, number> = {};
  let total = 0;

  // RSI(7) momentum signal: 0-7 points
  // Best when RSI is between 55-75 (bullish momentum, not overbought)
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

  // 5m Momentum: 0-7 points
  if (signals.momentum5m > 0.05) {
    components.momentum5m = Math.min(7, Math.round(signals.momentum5m / 0.05) * 2);
  } else if (signals.momentum5m > 0) {
    components.momentum5m = 2;
  } else {
    components.momentum5m = 0;
  }
  total += components.momentum5m;

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
  if (signals.adx >= 20 && signals.adx <= 50) {
    components.adx = Math.min(5, Math.round((signals.adx - 15) / 7));
  } else if (signals.adx > 50) {
    components.adx = 3; // Very strong, might reverse
  } else {
    components.adx = 0;
  }
  total += components.adx;

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

  // Absorption bonus: 0-2 points
  components.absorption = signals.absorption ? 2 : 0;
  total += components.absorption;

  // Chop penalty: -5 points
  if (signals.chop) {
    components.chop = -5;
    total += -5;
  } else {
    components.chop = 0;
  }

  total = Math.max(0, Math.min(35, total));

  // Determine tier
  let tier: 'TIER1' | 'TIER2' | 'TIER3';
  if (total >= settings.tier1_threshold) {
    tier = 'TIER1';
  } else if (total >= settings.tier2_threshold) {
    tier = 'TIER2';
  } else {
    tier = 'TIER3';
  }

  return { total, tier, components };
}
