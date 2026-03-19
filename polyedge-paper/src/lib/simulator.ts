import { Settings, SimulatedTradeResult } from '@/types';

export function simulateTrade(params: {
  side: 'YES';
  entryPrice: number;
  betAmount: number;
  outcome: 'YES' | 'NO';
  settings: Settings;
}): SimulatedTradeResult {
  const { entryPrice, betAmount, outcome, settings } = params;

  // 1. Calculate shares bought
  const contracts = betAmount / entryPrice;

  // 2. Simulate taker fee
  // Polymarket formula: fee = baseRate × min(price, 1-price) × size
  const takerFee = settings.sim_taker_fee_rate * Math.min(entryPrice, 1 - entryPrice) * betAmount;

  // 3. Simulate gas fee
  const gasFee = settings.sim_gas_fee;

  // 4. Calculate gross PnL
  let pnlGross: number;
  if (outcome === 'YES') {
    pnlGross = (contracts * 1.0) - betAmount;
  } else {
    pnlGross = -betAmount;
  }

  // 5. Add tiny random slippage for realism (0-0.1%)
  const slippage = betAmount * 0.001 * Math.random();

  // 6. Net PnL after fees
  const pnlNet = pnlGross - takerFee - gasFee - slippage;

  return {
    contracts: Math.round(contracts * 10000) / 10000,
    takerFee: Math.round(takerFee * 10000) / 10000,
    gasFee,
    slippage: Math.round(slippage * 10000) / 10000,
    pnlGross: Math.round(pnlGross * 100) / 100,
    pnlNet: Math.round(pnlNet * 100) / 100,
    won: outcome === 'YES',
  };
}

export function simulateResolution(params: {
  entryPrice: number;
  betAmount: number;
  outcome: 'YES' | 'NO';
  settings: Settings;
}): { pnlGross: number; pnlNet: number; takerFee: number; gasFee: number; closePrice: number } {
  const result = simulateTrade({
    side: 'YES',
    ...params,
  });

  return {
    pnlGross: result.pnlGross,
    pnlNet: result.pnlNet,
    takerFee: result.takerFee,
    gasFee: result.gasFee,
    closePrice: params.outcome === 'YES' ? 1.0 : 0.0,
  };
}
