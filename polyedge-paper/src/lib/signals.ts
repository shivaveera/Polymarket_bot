import { Candle, Signals } from '@/types';

export function computeSignals(candles: Candle[]): Signals {
  if (candles.length < 20) {
    throw new Error('Need at least 20 candles to compute signals');
  }

  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const current = closes[closes.length - 1];

  return {
    btcPrice: current,
    rsi7: computeRSI(closes, 7),
    momentum1m: computeMomentum(closes, 1),
    momentum5m: computeMomentum(closes, 5),
    adx: computeADX(highs, lows, closes, 14),
    volumeRatio: computeVolumeRatio(volumes, 20),
    bbWidth: computeBollingerWidth(closes, 20),
    vwapDistance: computeVWAPDistance(candles),
    chop: detectChop(closes, highs, lows, 14),
    absorption: detectAbsorption(candles),
  };
}

export function computeRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;
  const start = closes.length - period - 1;

  for (let i = start + 1; i <= start + period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smooth with remaining data
  for (let i = start + period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

export function computeMomentum(closes: number[], periods: number): number {
  if (closes.length < periods + 1) return 0;
  const current = closes[closes.length - 1];
  const previous = closes[closes.length - 1 - periods];
  return Math.round(((current - previous) / previous) * 10000) / 100; // percentage
}

export function computeADX(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period * 2) return 0;

  const trueRanges: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);

    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Smoothed averages
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
  let plusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let minusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxValues: number[] = [];

  for (let i = period; i < trueRanges.length; i++) {
    atr = atr - atr / period + trueRanges[i];
    plusDM = plusDM - plusDM / period + plusDMs[i];
    minusDM = minusDM - minusDM / period + minusDMs[i];

    const plusDI = atr > 0 ? (plusDM / atr) * 100 : 0;
    const minusDI = atr > 0 ? (minusDM / atr) * 100 : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxValues.push(dx);
  }

  if (dxValues.length < period) return 0;

  // ADX is smoothed average of DX
  let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  return Math.round(adx * 10) / 10;
}

export function computeVolumeRatio(volumes: number[], period: number): number {
  if (volumes.length < period + 1) return 1;
  const recent = volumes[volumes.length - 1];
  const avg = volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
  if (avg === 0) return 1;
  return Math.round((recent / avg) * 100) / 100;
}

export function computeBollingerWidth(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const width = (4 * std / mean) * 100; // percentage
  return Math.round(width * 100) / 100;
}

export function computeVWAPDistance(candles: Candle[]): number {
  if (candles.length === 0) return 0;
  let cumVolume = 0;
  let cumVwap = 0;

  for (const c of candles.slice(-20)) {
    const typical = (c.high + c.low + c.close) / 3;
    cumVolume += c.volume;
    cumVwap += typical * c.volume;
  }

  if (cumVolume === 0) return 0;
  const vwap = cumVwap / cumVolume;
  const current = candles[candles.length - 1].close;
  return Math.round(((current - vwap) / vwap) * 10000) / 100; // percentage
}

export function detectChop(closes: number[], highs: number[], lows: number[], period: number): boolean {
  if (closes.length < period) return false;

  // Choppiness Index: 100 * LOG10(SUM(ATR,period) / (Highest High - Lowest Low)) / LOG10(period)
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const hh = Math.max(...recentHighs);
  const ll = Math.min(...recentLows);
  const range = hh - ll;

  if (range === 0) return true;

  let atrSum = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      i > 0 ? Math.abs(highs[i] - closes[i - 1]) : 0,
      i > 0 ? Math.abs(lows[i] - closes[i - 1]) : 0
    );
    atrSum += tr;
  }

  const chop = 100 * Math.log10(atrSum / range) / Math.log10(period);
  return chop > 61.8; // High chop threshold
}

export function detectAbsorption(candles: Candle[]): boolean {
  if (candles.length < 3) return false;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const avgVol = candles.slice(-10).reduce((s, c) => s + c.volume, 0) / 10;

  // Absorption: high volume but small price movement
  const priceMove = Math.abs(last.close - last.open) / last.open;
  const highVolume = last.volume > avgVol * 1.5;
  const smallMove = priceMove < 0.001; // less than 0.1%

  // Also check wick rejection
  const bodySize = Math.abs(last.close - last.open);
  const totalRange = last.high - last.low;
  const wickRatio = totalRange > 0 ? bodySize / totalRange : 1;

  return highVolume && (smallMove || wickRatio < 0.3);
}
