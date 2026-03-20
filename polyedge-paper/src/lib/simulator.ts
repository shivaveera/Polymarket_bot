import { Settings, SimulatedTradeResult } from '@/types';

export function simulateTrade(params: {
  side: 'YES';
  entryPrice: number;
  betAmount: number;
  outcome: 'YES' | 'NO';
  settings: Settings;
  isMaker?: boolean;
}): SimulatedTradeResult {
  const { entryPrice, betAmount, outcome, settings, isMaker = false } = params;

  // 1. Calculate shares bought
  const contracts = betAmount / entryPrice;

  // 2. Fee calculation — different for maker vs taker
  let takerFee = 0;
  let makerRebate = 0;

  if (isMaker) {
    // Maker: 0% fee + daily rebate
    // Rebate is ~20% of what taker fees generate, paid daily
    // Simulating as small per-trade credit
    takerFee = 0;
    makerRebate = contracts * entryPrice * (1 - entryPrice) * 0.05;
  } else {
    // Taker: standard formula
    takerFee = settings.sim_taker_fee_rate * Math.min(entryPrice, 1 - entryPrice) * betAmount;
  }

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
  const slippage = isMaker ? 0 : betAmount * 0.001 * Math.random();

  // 6. Net PnL after fees (add rebate for makers)
  const pnlNet = pnlGross - takerFee - gasFee - slippage + makerRebate;

  return {
    contracts: Math.round(contracts * 10000) / 10000,
    takerFee: Math.round(takerFee * 10000) / 10000,
    gasFee,
    slippage: Math.round(slippage * 10000) / 10000,
    pnlGross: Math.round(pnlGross * 100) / 100,
    pnlNet: Math.round(pnlNet * 100) / 100,
    won: outcome === 'YES',
    isMaker,
    makerRebate: Math.round(makerRebate * 10000) / 10000,
  };
}

export function simulateResolution(params: {
  entryPrice: number;
  betAmount: number;
  outcome: 'YES' | 'NO';
  settings: Settings;
  isMaker?: boolean;
}): { pnlGross: number; pnlNet: number; takerFee: number; gasFee: number; closePrice: number; isMaker: boolean; makerRebate: number } {
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
    isMaker: result.isMaker,
    makerRebate: result.makerRebate,
  };
}
