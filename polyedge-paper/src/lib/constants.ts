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
};

export const SHEETS = {
  SETTINGS: 'settings',
  TRADES: 'trades',
  OBSERVATIONS: 'observations',
  DAILY_STATS: 'daily_stats',
  SIGNAL_WEIGHTS: 'signal_weights',
  CANDLES: 'candles',
} as const;

export const TRADE_HEADERS = [
  'id', 'timestamp', 'market_id', 'question', 'slug', 'side',
  'entry_price', 'timeframe_min', 'end_time', 'amount_usd', 'contracts',
  'tier', 'confidence_score', 'status', 'resolution', 'close_price',
  'pnl_gross', 'taker_fee', 'gas_fee', 'pnl_net', 'bankroll_after',
  'btc_price', 'rsi7', 'momentum_5m', 'adx', 'volume_ratio', 'chop',
  'ai_decision', 'ai_confidence', 'ai_reasoning',
];

export const OBSERVATION_HEADERS = [
  'id', 'timestamp', 'market_id', 'question', 'timeframe_min', 'end_time',
  'yes_price', 'no_price', 'btc_price', 'rsi7', 'momentum_1m', 'momentum_5m',
  'adx', 'volume_ratio', 'bb_width', 'vwap_distance', 'chop', 'absorption',
  'score', 'tier', 'traded', 'trade_id', 'skip_reason', 'market_outcome',
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

export const BINANCE_API = 'https://api.binance.com';
export const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';

export const MAX_CANDLES_STORED = 100;
