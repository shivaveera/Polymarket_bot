export const DEFAULT_SETTINGS = {
  trading_enabled: true,
  bankroll: 20,
  max_bet: 2,
  max_simultaneous: 3,
  max_trades_per_hour: 20,
  entry_price_max: 0.80,
  tier1_threshold: 25,
  tier2_threshold: 15,
  ai_enabled: true,
  ai_confidence_min: 60,
  timeframes: [15, 5],
  blackout_hours: [22, 23, 0, 1, 2, 3],
  sim_gas_fee: 0.005,
  sim_taker_fee_rate: 0.01,
  max_consecutive_losses: 3,
  max_drawdown_pct: 20,
  peak_bankroll: 20,
  telegram_enabled: false,
  telegram_bot_token: '',
  telegram_chat_id: '',
  discord_enabled: false,
  discord_webhook_url: '',
  // Pre-order settings
  preorder_enabled: true,
  preorder_before_seconds: 180,
  preorder_skip_if_clear: 0.90,
  // Early exit settings
  early_exit_enabled: true,
  danger_price: 0.35,
  danger_time_minutes: 5,
  danger_time_price: 0.48,
  no_exit_final_seconds: 60,
  // Circuit breaker (enhanced)
  circuit_breaker_enabled: true,
  // Strategy D: Window Delta (THE primary signal)
  window_delta_enabled: true,
  // Strategy F: ADX Hard Gate (instant SKIP below 25)
  adx_hard_gate_enabled: true,
  // Strategy G: Momentum Cliff at 0.15%
  momentum_cliff_enabled: true,
  // Strategy H: Loss Signature Pattern Match
  loss_signature_enabled: true,
  // Strategy I: Regime-Aware Base Rate Tracking
  regime_tracking_enabled: true,
  regime_window: 50,
  auto_pause_below_base_rate: 0.50,
  // Strategy J: Trade Cooldown
  cooldown_enabled: true,
  // Strategy B: Flash Crash Buy
  flash_crash_enabled: true,
  flash_crash_drop_threshold: 0.15,
  flash_crash_momentum_floor: -0.10,
  flash_crash_size_multiplier: 1.4,
  // Strategy C: Streak Reversal
  streak_tracking_enabled: true,
  streak_length: 5,
  streak_penalty: -5,
  streak_bonus: 3,
  // Strategy E: Oracle Check
  oracle_check_enabled: true,
  oracle_divergence_threshold: 0.07,
  // Strategy A: Endcycle Sniper
  endcycle_sniper_enabled: true,
  endcycle_min_price: 0.90,
  endcycle_max_seconds: 30,
  endcycle_size_multiplier: 0.2,
};

export const SHEETS = {
  SETTINGS: 'settings',
  TRADES: 'trades',
  OBSERVATIONS: 'observations',
  DAILY_STATS: 'daily_stats',
  SIGNAL_WEIGHTS: 'signal_weights',
  CANDLES: 'candles',
  PREORDERS: 'preorders',
} as const;

export const TRADE_HEADERS = [
  'id', 'timestamp', 'market_id', 'question', 'slug', 'side',
  'entry_price', 'timeframe_min', 'end_time', 'amount_usd', 'contracts',
  'tier', 'confidence_score', 'status', 'resolution', 'close_price',
  'pnl_gross', 'taker_fee', 'gas_fee', 'pnl_net', 'bankroll_after',
  'btc_price', 'rsi7', 'momentum_5m', 'adx', 'volume_ratio', 'chop',
  'regime', 'ai_decision', 'ai_confidence', 'ai_reasoning',
  'exit_reason', 'exit_price', 'savings_vs_hold', 'is_maker', 'maker_rebate',
];

export const OBSERVATION_HEADERS = [
  'id', 'timestamp', 'market_id', 'question', 'timeframe_min', 'end_time',
  'yes_price', 'no_price', 'btc_price', 'rsi7', 'momentum_1m', 'momentum_5m',
  'adx', 'volume_ratio', 'bb_width', 'vwap_distance', 'chop', 'absorption',
  'score', 'tier', 'traded', 'trade_id', 'skip_reason', 'market_outcome',
  'current_window_yes_price', 'current_window_minutes_left',
];

export const DAILY_STATS_HEADERS = [
  'date', 'trades_total', 'trades_won', 'trades_lost', 'win_rate',
  'pnl_gross', 'pnl_net', 'total_fees', 'bankroll_start', 'bankroll_end',
  'base_yes_rate', 'bot_alpha', 'observations', 'regime', 'best_signal',
];

export const SIGNAL_WEIGHT_HEADERS = [
  'signal', 'weight', 'validated', 'lift', 'sample_size', 'last_updated',
];

export const CANDLE_HEADERS = [
  'openTime', 'open', 'high', 'low', 'close', 'volume', 'closeTime',
  'rsi7', 'adx', 'momentum1m', 'momentum5m', 'volumeRatio', 'bbWidth', 'vwapDistance',
];

export const PREORDER_HEADERS = [
  'id', 'slug', 'market_id', 'side', 'limit_price', 'amount',
  'window_start', 'window_end', 'status', 'fill_price',
  'is_maker', 'signal_score', 'placed_at', 'filled_at',
];

export const BINANCE_API = 'https://api.binance.com';
export const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';

export const MAX_CANDLES_STORED = 100;
