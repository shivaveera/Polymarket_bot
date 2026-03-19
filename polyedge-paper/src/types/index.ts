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
  status: 'open' | 'won' | 'lost';
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
  ai_decision: string;
  ai_confidence: number;
  ai_reasoning: string;
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
