import { Settings } from '@/types';

/**
 * Pre-order logic: calculate the NEXT market's slug and place
 * a simulated maker limit order before the window opens.
 *
 * Polymarket 15m markets use deterministic slugs:
 *   btc-updown-15m-{unix_timestamp}
 * where timestamp = period start, aligned to :00/:15/:30/:45 ET
 *
 * 5m markets:
 *   btc-updown-5m-{unix_timestamp}
 * where timestamp aligns to every 300 seconds
 */

/**
 * Get the current ET (Eastern Time) offset in seconds.
 * ET is UTC-5 (EST) or UTC-4 (EDT during DST).
 * DST: second Sunday in March to first Sunday in November.
 */
function getETOffsetSeconds(): number {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  // Use a trick: create a date in ET and check if DST is active
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const utcNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const diffMs = utcNow.getTime() - etNow.getTime();
  return Math.round(diffMs / 1000);
}

/**
 * Align timestamps to ET boundaries for Polymarket windows.
 * Polymarket 15m windows align to :00/:15/:30/:45 ET.
 * 5m windows align to every 300 seconds in ET.
 */
function alignToET(nowUnix: number, intervalSeconds: number): number {
  const etOffset = getETOffsetSeconds();
  // Convert to ET-relative time, align, then convert back
  const etTime = nowUnix - etOffset;
  const aligned = etTime - (etTime % intervalSeconds);
  return aligned + etOffset;
}

export function getNextWindowTimestamp(
  timeframeMinutes: number
): { start: number; end: number; slug: string } {
  const now = Math.floor(Date.now() / 1000);
  const interval = timeframeMinutes * 60;

  // Align to ET boundaries (Polymarket uses Eastern Time)
  const currentStart = alignToET(now, interval);
  // Next window start
  const nextStart = currentStart + interval;
  const nextEnd = nextStart + interval;

  const slug = `btc-updown-${timeframeMinutes}m-${nextStart}`;

  return { start: nextStart, end: nextEnd, slug };
}

export function getCurrentWindowSlug(timeframeMinutes: number): string {
  const now = Math.floor(Date.now() / 1000);
  const interval = timeframeMinutes * 60;
  const currentStart = alignToET(now, interval);
  return `btc-updown-${timeframeMinutes}m-${currentStart}`;
}

export function shouldPlacePreOrder(params: {
  secondsUntilNextWindow: number;
  placeBeforeSeconds: number;
  currentWindowYesPrice: number;
  signalScore: number;
  settings: Settings;
}): { shouldPlace: boolean; reason: string } {
  const { secondsUntilNextWindow, placeBeforeSeconds,
          currentWindowYesPrice, signalScore, settings } = params;

  if (!settings.preorder_enabled) {
    return { shouldPlace: false, reason: 'preorder_disabled' };
  }

  // Not time yet
  if (secondsUntilNextWindow > placeBeforeSeconds) {
    return { shouldPlace: false, reason: 'too_early_for_preorder' };
  }

  // Already too late (window is about to start, use normal flow)
  if (secondsUntilNextWindow < 10) {
    return { shouldPlace: false, reason: 'window_starting_use_normal_flow' };
  }

  // Signal too weak
  if (signalScore < settings.tier2_threshold) {
    return { shouldPlace: false, reason: 'signal_too_weak_for_preorder' };
  }

  // Current window is "clear" (YES > skip threshold) — mean reversion risk on next
  if (currentWindowYesPrice > settings.preorder_skip_if_clear) {
    return { shouldPlace: false, reason: 'current_window_clear_mean_reversion_risk' };
  }

  return { shouldPlace: true, reason: 'preorder_conditions_met' };
}

export function simulatePreOrderFill(params: {
  limitPrice: number;
  marketYesPrice: number;
  spread: number;
}): { filled: boolean; fillPrice: number; isMaker: boolean } {
  // Maker order fills if market price reaches our limit
  // At window open, prices usually start near 0.50
  // Our limit at 0.505 would fill almost immediately
  if (params.marketYesPrice <= params.limitPrice + params.spread) {
    return {
      filled: true,
      fillPrice: params.limitPrice,  // maker gets their exact price
      isMaker: true,
    };
  }
  return { filled: false, fillPrice: 0, isMaker: false };
}
