export interface Settings {
  trading_enabled: boolean;
  bankroll: number;
  max_bet: number;
  max_simultaneous: number;
  max_trades_per_hour: number;
  entry_price_max: number;
  tier1_threshold: number;
  tier2_threshold: number;
  ai_enabled: boolean;
  ai_confidence_min: number;
  timeframes: number[];
  blackout_hours: number[];
  sim_gas_fee: number;
  sim_taker_fee_rate: number;
  max_consecutive_losses: number;
  max_drawdown_pct: number;
  peak_bankroll: number;
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  discord_enabled: boolean;
  discord_webhook_url: string;
  // Pre-order settings
  preorder_enabled: boolean;
  preorder_before_seconds: number;
  preorder_skip_if_clear: number;
  // Early exit settings
  early_exit_enabled: boolean;
  danger_price: number;
  danger_time_minutes: number;
  danger_time_price: number;
  no_exit_final_seconds: number;
  // Circuit breaker (enhanced)
  circuit_breaker_enabled: boolean;
  // Strategy D: Window Delta
  window_delta_enabled: boolean;
  // Strategy F: ADX Hard Gate
  adx_hard_gate_enabled: boolean;
  // Strategy G: Momentum Cliff
  momentum_cliff_enabled: boolean;
  // Strategy H: Loss Signature
  loss_signature_enabled: boolean;
  // Strategy I: Regime Tracking
  regime_tracking_enabled: boolean;
  regime_window: number;
  auto_pause_below_base_rate: number;
  // Strategy J: Trade Cooldown
  cooldown_enabled: boolean;
  // Strategy B: Flash Crash
  flash_crash_enabled: boolean;
  flash_crash_drop_threshold: number;
  flash_crash_momentum_floor: number;
  flash_crash_size_multiplier: number;
  // Strategy C: Streak Reversal
  streak_tracking_enabled: boolean;
  streak_length: number;
  streak_penalty: number;
  streak_bonus: number;
  // Strategy E: Oracle Check
  oracle_check_enabled: boolean;
  oracle_divergence_threshold: number;
  // Strategy A: Endcycle Sniper
  endcycle_sniper_enabled: boolean;
  endcycle_min_price: number;
  endcycle_max_seconds: number;
  endcycle_size_multiplier: number;
}

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface Signals {
  btcPrice: number;
  rsi7: number;
  momentum1m: number;
  momentum5m: number;
  adx: number;
  volumeRatio: number;
  bbWidth: number;
  vwapDistance: number;
  chop: boolean;
  absorption: boolean;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  endDate: string;
  yesPrice: number;
  noPrice: number;
  active: boolean;
  volume: number;
  liquidity: number;
}

export interface ScoredMarket {
  market: PolymarketMarket;
  signals: Signals;
  score: number;
  tier: 'TIER1' | 'TIER2' | 'TIER3';
  timeframeMin: number;
}

export interface Trade {
  id: string;
  timestamp: string;
  market_id: string;
  question: string;
  slug: string;
  side: 'YES';
  entry_price: number;
  timeframe_min: number;
  end_time: string;
  amount_usd: number;
  contracts: number;
  tier: string;
  confidence_score: number;
  status: 'open' | 'won' | 'lost' | 'exited_early';
  resolution: string;
  close_price: number;
  pnl_gross: number;
  taker_fee: number;
  gas_fee: number;
  pnl_net: number;
  bankroll_after: number;
  btc_price: number;
  rsi7: number;
  momentum_5m: number;
  adx: number;
  volume_ratio: number;
  chop: boolean;
  regime: string;
  ai_decision: string;
  ai_confidence: number;
  ai_reasoning: string;
  // Early exit fields
  exit_reason: string;
  exit_price: number;
  savings_vs_hold: number;
  // Maker order fields
  is_maker: boolean;
  maker_rebate: number;
}

export interface PreOrder {
  id: string;
  slug: string;
  market_id: string;
  side: 'YES';
  limit_price: number;
  amount: number;
  window_start: string;
  window_end: string;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  fill_price: number;
  is_maker: boolean;
  signal_score: number;
  placed_at: string;
  filled_at: string;
}

export interface Observation {
  id: string;
  timestamp: string;
  market_id: string;
  question: string;
  timeframe_min: number;
  end_time: string;
  yes_price: number;
  no_price: number;
  btc_price: number;
  rsi7: number;
  momentum_1m: number;
  momentum_5m: number;
  adx: number;
  volume_ratio: number;
  bb_width: number;
  vwap_distance: number;
  chop: boolean;
  absorption: boolean;
  score: number;
  tier: string;
  traded: boolean;
  trade_id: string;
  skip_reason: string;
  market_outcome: string;
  current_window_yes_price: number;
  current_window_minutes_left: number;
}

export interface DailyStats {
  date: string;
  trades_total: number;
  trades_won: number;
  trades_lost: number;
  win_rate: number;
  pnl_gross: number;
  pnl_net: number;
  total_fees: number;
  bankroll_start: number;
  bankroll_end: number;
  base_yes_rate: number;
  bot_alpha: number;
  observations: number;
  regime: string;
  best_signal: string;
}

export interface SimulatedTradeResult {
  contracts: number;
  takerFee: number;
  gasFee: number;
  slippage: number;
  pnlGross: number;
  pnlNet: number;
  won: boolean;
  isMaker: boolean;
  makerRebate: number;
}

export interface CircuitBreakerStatus {
  triggered: boolean;
  reason: string | null;
  consecutiveLosses: number;
  drawdownPct: number;
  peakBankroll: number;
}

export interface AIValidation {
  decision: 'YES' | 'SKIP';
  confidence: number;
  reasoning: string;
}

export interface SignalWeight {
  signal: string;
  weight: number;
  validated: boolean;
  lift: number;
  sample_size: number;
  last_updated: string;
}
