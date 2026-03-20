import { Settings } from '@/types';

/**
 * Early exit logic: monitor open trades and sell if YES price
 * deteriorates past danger thresholds.
 *
 * Two triggers:
 * 1. Price-based: YES price drops below danger_price -> sell
 * 2. Time-based: if X minutes passed and price below entry -> sell
 *
 * For paper trading, "selling" means:
 * - Close the trade at current YES price (not $0 or $1)
 * - PnL = (sellPrice - entryPrice) * contracts - fees
 */

export interface EarlyExitCheck {
  shouldExit: boolean;
  reason: 'price_danger' | 'time_danger' | 'none';
  currentPrice: number;
  estimatedLoss: number;
  savingsVsHold: number;
}

export function checkEarlyExit(params: {
  entryPrice: number;
  currentYesPrice: number;
  secondsSinceEntry: number;
  minutesToResolution: number;
  settings: Settings;
}): EarlyExitCheck {
  const { entryPrice, currentYesPrice, secondsSinceEntry,
          minutesToResolution, settings } = params;

  if (!settings.early_exit_enabled) {
    return { shouldExit: false, reason: 'none', currentPrice: currentYesPrice,
             estimatedLoss: 0, savingsVsHold: 0 };
  }

  // Don't exit in final seconds — let it resolve naturally
  if (minutesToResolution * 60 < settings.no_exit_final_seconds) {
    return { shouldExit: false, reason: 'none', currentPrice: currentYesPrice,
             estimatedLoss: 0, savingsVsHold: 0 };
  }

  const contractsPerDollar = 1 / entryPrice;
  const fullLoss = entryPrice;  // losing the full bet per contract
  const earlyLoss = entryPrice - currentYesPrice;  // selling at lower price

  // TRIGGER 1: Price danger — YES dropped below absolute threshold
  if (currentYesPrice <= settings.danger_price) {
    return {
      shouldExit: true,
      reason: 'price_danger',
      currentPrice: currentYesPrice,
      estimatedLoss: earlyLoss * contractsPerDollar,
      savingsVsHold: (fullLoss - earlyLoss) * contractsPerDollar,
    };
  }

  // TRIGGER 2: Time danger — price below entry for too long
  if (secondsSinceEntry > settings.danger_time_minutes * 60 &&
      currentYesPrice < settings.danger_time_price) {
    return {
      shouldExit: true,
      reason: 'time_danger',
      currentPrice: currentYesPrice,
      estimatedLoss: earlyLoss * contractsPerDollar,
      savingsVsHold: (fullLoss - earlyLoss) * contractsPerDollar,
    };
  }

  return { shouldExit: false, reason: 'none', currentPrice: currentYesPrice,
           estimatedLoss: 0, savingsVsHold: 0 };
}

export function simulateEarlyExit(params: {
  entryPrice: number;
  sellPrice: number;
  betAmount: number;
  settings: Settings;
}): { pnlNet: number; takerFee: number; gasFee: number } {
  const { entryPrice, sellPrice, betAmount, settings } = params;
  const contracts = betAmount / entryPrice;

  // Selling at current price — we're a taker (selling into bids)
  const saleProceeds = contracts * sellPrice;
  const pnlGross = saleProceeds - betAmount;

  // Taker fee on the SELL side
  const takerFee = contracts * sellPrice * (1 - sellPrice) * settings.sim_taker_fee_rate;

  // Gas for the sell transaction
  const gasFee = settings.sim_gas_fee;

  const pnlNet = pnlGross - takerFee - gasFee;

  return {
    pnlNet: Math.round(pnlNet * 100) / 100,
    takerFee: Math.round(takerFee * 10000) / 10000,
    gasFee,
  };
}
