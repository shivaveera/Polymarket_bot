import { Settings } from '@/types';

export function calculateBetSize(
  entryPrice: number,
  settings: Settings,
  currentBankroll: number
): number {
  // Scale bet size by entry price — lower price = more upside = can bet more
  // At 0.50: use max_bet
  // At 0.70: use 60% of max_bet
  // At 0.80: use 40% of max_bet
  const priceScalar = Math.max(0.3, 1 - (entryPrice - 0.50) * 2);
  let betSize = settings.max_bet * priceScalar;

  // Kelly-inspired cap: never bet more than 10% of bankroll
  const kellyMax = currentBankroll * 0.10;
  betSize = Math.min(betSize, kellyMax);

  // Floor at $0.50
  betSize = Math.max(0.50, betSize);

  // Cap at max_bet
  betSize = Math.min(betSize, settings.max_bet);

  // Cap at available bankroll
  betSize = Math.min(betSize, currentBankroll);

  return Math.round(betSize * 100) / 100;
}
