import { google, sheets_v4 } from 'googleapis';
import { Settings, Trade, Observation, DailyStats, SignalWeight, PreOrder } from '@/types';
import { SHEETS, DEFAULT_SETTINGS } from './constants';

let sheetsClient: sheets_v4.Sheets | null = null;

function getSheets(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function getSheetId(): string {
  return process.env.GOOGLE_SHEET_ID || '';
}

export async function getSheetData(tab: string, range?: string): Promise<string[][]> {
  const sheets = getSheets();
  const fullRange = range ? `${tab}!${range}` : tab;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: fullRange,
  });
  return (res.data.values as string[][]) || [];
}

export async function appendRows(tab: string, rows: (string | number | boolean)[][]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: tab,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}

export async function updateCell(tab: string, range: string, value: string | number | boolean): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${tab}!${range}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

export async function updateRow(tab: string, range: string, values: (string | number | boolean)[]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${tab}!${range}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

export async function getSettings(): Promise<Settings> {
  const data = await getSheetData(SHEETS.SETTINGS);
  if (!data || data.length < 2) return DEFAULT_SETTINGS as Settings;

  const settings: Record<string, string> = {};
  for (const row of data.slice(1)) {
    if (row[0] && row[1] !== undefined) {
      settings[row[0]] = row[1];
    }
  }

  return {
    trading_enabled: settings.trading_enabled === 'TRUE',
    bankroll: parseFloat(settings.bankroll) || DEFAULT_SETTINGS.bankroll,
    max_bet: parseFloat(settings.max_bet) || DEFAULT_SETTINGS.max_bet,
    max_simultaneous: parseInt(settings.max_simultaneous) || DEFAULT_SETTINGS.max_simultaneous,
    max_trades_per_hour: parseInt(settings.max_trades_per_hour) || DEFAULT_SETTINGS.max_trades_per_hour,
    entry_price_max: parseFloat(settings.entry_price_max) || DEFAULT_SETTINGS.entry_price_max,
    tier1_threshold: parseInt(settings.tier1_threshold) || DEFAULT_SETTINGS.tier1_threshold,
    tier2_threshold: parseInt(settings.tier2_threshold) || DEFAULT_SETTINGS.tier2_threshold,
    ai_enabled: settings.ai_enabled === 'TRUE',
    ai_confidence_min: parseInt(settings.ai_confidence_min) || DEFAULT_SETTINGS.ai_confidence_min,
    timeframes: settings.timeframes
      ? settings.timeframes.split(',').map(Number)
      : DEFAULT_SETTINGS.timeframes,
    blackout_hours: settings.blackout_hours
      ? settings.blackout_hours.split(',').map(Number)
      : DEFAULT_SETTINGS.blackout_hours,
    sim_gas_fee: parseFloat(settings.sim_gas_fee) || DEFAULT_SETTINGS.sim_gas_fee,
    sim_taker_fee_rate: parseFloat(settings.sim_taker_fee_rate) || DEFAULT_SETTINGS.sim_taker_fee_rate,
    max_consecutive_losses: parseInt(settings.max_consecutive_losses) || DEFAULT_SETTINGS.max_consecutive_losses,
    max_drawdown_pct: parseFloat(settings.max_drawdown_pct) || DEFAULT_SETTINGS.max_drawdown_pct,
    peak_bankroll: parseFloat(settings.peak_bankroll) || DEFAULT_SETTINGS.peak_bankroll,
    telegram_enabled: settings.telegram_enabled === 'TRUE',
    telegram_bot_token: settings.telegram_bot_token || '',
    telegram_chat_id: settings.telegram_chat_id || '',
    discord_enabled: settings.discord_enabled === 'TRUE',
    discord_webhook_url: settings.discord_webhook_url || '',
    // Pre-order settings
    preorder_enabled: settings.preorder_enabled !== undefined
      ? settings.preorder_enabled === 'TRUE'
      : DEFAULT_SETTINGS.preorder_enabled,
    preorder_before_seconds: parseInt(settings.preorder_before_seconds) || DEFAULT_SETTINGS.preorder_before_seconds,
    preorder_skip_if_clear: parseFloat(settings.preorder_skip_if_clear) || DEFAULT_SETTINGS.preorder_skip_if_clear,
    // Early exit settings
    early_exit_enabled: settings.early_exit_enabled !== undefined
      ? settings.early_exit_enabled === 'TRUE'
      : DEFAULT_SETTINGS.early_exit_enabled,
    danger_price: parseFloat(settings.danger_price) || DEFAULT_SETTINGS.danger_price,
    danger_time_minutes: parseInt(settings.danger_time_minutes) || DEFAULT_SETTINGS.danger_time_minutes,
    danger_time_price: parseFloat(settings.danger_time_price) || DEFAULT_SETTINGS.danger_time_price,
    no_exit_final_seconds: parseInt(settings.no_exit_final_seconds) || DEFAULT_SETTINGS.no_exit_final_seconds,
    // Circuit breaker
    circuit_breaker_enabled: settings.circuit_breaker_enabled !== undefined
      ? settings.circuit_breaker_enabled === 'TRUE'
      : DEFAULT_SETTINGS.circuit_breaker_enabled,
    // Strategy D: Window Delta
    window_delta_enabled: settings.window_delta_enabled !== undefined
      ? settings.window_delta_enabled === 'TRUE'
      : DEFAULT_SETTINGS.window_delta_enabled,
    // Strategy F: ADX Hard Gate
    adx_hard_gate_enabled: settings.adx_hard_gate_enabled !== undefined
      ? settings.adx_hard_gate_enabled === 'TRUE'
      : DEFAULT_SETTINGS.adx_hard_gate_enabled,
    // Strategy G: Momentum Cliff
    momentum_cliff_enabled: settings.momentum_cliff_enabled !== undefined
      ? settings.momentum_cliff_enabled === 'TRUE'
      : DEFAULT_SETTINGS.momentum_cliff_enabled,
    // Strategy H: Loss Signature
    loss_signature_enabled: settings.loss_signature_enabled !== undefined
      ? settings.loss_signature_enabled === 'TRUE'
      : DEFAULT_SETTINGS.loss_signature_enabled,
    // Strategy I: Regime Tracking
    regime_tracking_enabled: settings.regime_tracking_enabled !== undefined
      ? settings.regime_tracking_enabled === 'TRUE'
      : DEFAULT_SETTINGS.regime_tracking_enabled,
    regime_window: parseInt(settings.regime_window) || DEFAULT_SETTINGS.regime_window,
    auto_pause_below_base_rate: parseFloat(settings.auto_pause_below_base_rate) || DEFAULT_SETTINGS.auto_pause_below_base_rate,
    // Strategy J: Trade Cooldown
    cooldown_enabled: settings.cooldown_enabled !== undefined
      ? settings.cooldown_enabled === 'TRUE'
      : DEFAULT_SETTINGS.cooldown_enabled,
    // Strategy B: Flash Crash
    flash_crash_enabled: settings.flash_crash_enabled !== undefined
      ? settings.flash_crash_enabled === 'TRUE'
      : DEFAULT_SETTINGS.flash_crash_enabled,
    flash_crash_drop_threshold: parseFloat(settings.flash_crash_drop_threshold) || DEFAULT_SETTINGS.flash_crash_drop_threshold,
    flash_crash_momentum_floor: parseFloat(settings.flash_crash_momentum_floor) || DEFAULT_SETTINGS.flash_crash_momentum_floor,
    flash_crash_size_multiplier: parseFloat(settings.flash_crash_size_multiplier) || DEFAULT_SETTINGS.flash_crash_size_multiplier,
    // Strategy C: Streak Reversal
    streak_tracking_enabled: settings.streak_tracking_enabled !== undefined
      ? settings.streak_tracking_enabled === 'TRUE'
      : DEFAULT_SETTINGS.streak_tracking_enabled,
    streak_length: parseInt(settings.streak_length) || DEFAULT_SETTINGS.streak_length,
    streak_penalty: parseInt(settings.streak_penalty) || DEFAULT_SETTINGS.streak_penalty,
    streak_bonus: parseInt(settings.streak_bonus) || DEFAULT_SETTINGS.streak_bonus,
    // Strategy E: Oracle Check
    oracle_check_enabled: settings.oracle_check_enabled !== undefined
      ? settings.oracle_check_enabled === 'TRUE'
      : DEFAULT_SETTINGS.oracle_check_enabled,
    oracle_divergence_threshold: parseFloat(settings.oracle_divergence_threshold) || DEFAULT_SETTINGS.oracle_divergence_threshold,
    // Strategy A: Endcycle Sniper
    endcycle_sniper_enabled: settings.endcycle_sniper_enabled !== undefined
      ? settings.endcycle_sniper_enabled === 'TRUE'
      : DEFAULT_SETTINGS.endcycle_sniper_enabled,
    endcycle_min_price: parseFloat(settings.endcycle_min_price) || DEFAULT_SETTINGS.endcycle_min_price,
    endcycle_max_seconds: parseInt(settings.endcycle_max_seconds) || DEFAULT_SETTINGS.endcycle_max_seconds,
    endcycle_size_multiplier: parseFloat(settings.endcycle_size_multiplier) || DEFAULT_SETTINGS.endcycle_size_multiplier,
  };
}

export async function updateSettings(updates: Partial<Settings>): Promise<void> {
  const data = await getSheetData(SHEETS.SETTINGS);
  if (!data || data.length < 2) return;

  const sheets = getSheets();
  const requests: sheets_v4.Schema$ValueRange[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const rowIndex = data.findIndex(row => row[0] === key);
    if (rowIndex >= 0) {
      const cellValue = Array.isArray(value) ? value.join(',') : String(value);
      requests.push({
        range: `${SHEETS.SETTINGS}!B${rowIndex + 1}`,
        values: [[typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : cellValue]],
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: getSheetId(),
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: requests,
      },
    });
  }
}

export async function getOpenTrades(): Promise<{ trade: Trade; rowIndex: number }[]> {
  const data = await getSheetData(SHEETS.TRADES);
  if (!data || data.length < 2) return [];

  const headers = data[0];
  const statusIdx = headers.indexOf('status');
  const results: { trade: Trade; rowIndex: number }[] = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][statusIdx] === 'open') {
      const trade = rowToTrade(headers, data[i]);
      results.push({ trade, rowIndex: i + 1 });
    }
  }
  return results;
}

export async function getAllTrades(): Promise<Trade[]> {
  const data = await getSheetData(SHEETS.TRADES);
  if (!data || data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => rowToTrade(headers, row));
}

export async function getTradesSince(since: Date): Promise<Trade[]> {
  const all = await getAllTrades();
  return all.filter(t => new Date(t.timestamp) >= since);
}

export async function getObservationsSince(since: Date): Promise<Observation[]> {
  const data = await getSheetData(SHEETS.OBSERVATIONS);
  if (!data || data.length < 2) return [];
  const headers = data[0];
  return data.slice(1)
    .map(row => rowToObservation(headers, row))
    .filter(o => new Date(o.timestamp) >= since);
}

export async function appendTrade(trade: Trade): Promise<void> {
  await appendRows(SHEETS.TRADES, [tradeToRow(trade)]);
}

export async function appendObservation(obs: Observation): Promise<void> {
  await appendRows(SHEETS.OBSERVATIONS, [observationToRow(obs)]);
}

export async function appendDailyStats(stats: DailyStats): Promise<void> {
  await appendRows(SHEETS.DAILY_STATS, [dailyStatsToRow(stats)]);
}

export async function updateTradeResolution(
  rowIndex: number,
  updates: {
    status: string;
    resolution: string;
    close_price: number;
    pnl_gross: number;
    taker_fee: number;
    gas_fee: number;
    pnl_net: number;
    bankroll_after: number;
    exit_reason?: string;
    exit_price?: number;
    savings_vs_hold?: number;
    is_maker?: boolean;
    maker_rebate?: number;
  }
): Promise<void> {
  const sheets = getSheets();
  // Update columns N through AI (status=N, resolution=O, close_price=P, pnl_gross=Q,
  // taker_fee=R, gas_fee=S, pnl_net=T, bankroll_after=U,
  // ... existing columns V-AE ...,
  // exit_reason=AF, exit_price=AG, savings_vs_hold=AH, is_maker=AI, maker_rebate=AJ)

  // First update the core resolution columns N-U
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.TRADES}!N${rowIndex}:U${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        updates.status,
        updates.resolution,
        updates.close_price,
        updates.pnl_gross,
        updates.taker_fee,
        updates.gas_fee,
        updates.pnl_net,
        updates.bankroll_after,
      ]],
    },
  });

  // Then update the new columns AF-AJ (columns 32-36, 0-indexed)
  if (updates.exit_reason !== undefined || updates.is_maker !== undefined) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${SHEETS.TRADES}!AF${rowIndex}:AJ${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          updates.exit_reason || '',
          updates.exit_price || 0,
          updates.savings_vs_hold || 0,
          updates.is_maker ? 'TRUE' : 'FALSE',
          updates.maker_rebate || 0,
        ]],
      },
    });
  }
}

export async function getRecentTrades(limit: number): Promise<Trade[]> {
  const all = await getAllTrades();
  return all.slice(-limit);
}

export async function getDailyStats(): Promise<DailyStats[]> {
  const data = await getSheetData(SHEETS.DAILY_STATS);
  if (!data || data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => rowToDailyStats(headers, row));
}

export async function getSignalWeights(): Promise<SignalWeight[]> {
  const data = await getSheetData(SHEETS.SIGNAL_WEIGHTS);
  if (!data || data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return {
      signal: obj.signal,
      weight: parseFloat(obj.weight) || 1,
      validated: obj.validated === 'TRUE',
      lift: parseFloat(obj.lift) || 0,
      sample_size: parseInt(obj.sample_size) || 0,
      last_updated: obj.last_updated,
    };
  });
}

export async function checkCircuitBreaker(settings: Settings): Promise<{ tripped: boolean; reason: string }> {
  if (!settings.circuit_breaker_enabled) {
    return { tripped: false, reason: '' };
  }

  const all = await getAllTrades();
  const closed = all.filter(t => t.status === 'won' || t.status === 'lost' || t.status === 'exited_early');

  // Check consecutive losses (including early exits)
  if (closed.length >= settings.max_consecutive_losses) {
    const recent = closed.slice(-settings.max_consecutive_losses);
    const allLosses = recent.every(t => t.status === 'lost' || t.status === 'exited_early');
    if (allLosses) {
      return {
        tripped: true,
        reason: `${settings.max_consecutive_losses} consecutive losses`,
      };
    }
  }

  // Check drawdown from peak
  const drawdownPct = settings.peak_bankroll > 0
    ? ((settings.peak_bankroll - settings.bankroll) / settings.peak_bankroll) * 100
    : 0;
  if (drawdownPct >= settings.max_drawdown_pct) {
    return {
      tripped: true,
      reason: `Drawdown ${drawdownPct.toFixed(1)}% exceeds ${settings.max_drawdown_pct}% max (peak: $${settings.peak_bankroll.toFixed(2)}, current: $${settings.bankroll.toFixed(2)})`,
    };
  }

  return { tripped: false, reason: '' };
}

export async function getTradesInLastHour(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const trades = await getTradesSince(oneHourAgo);
  return trades.length;
}

// ===== Pre-order CRUD =====

export async function appendPreOrder(preorder: PreOrder): Promise<void> {
  await appendRows(SHEETS.PREORDERS, [preOrderToRow(preorder)]);
}

export async function getPendingPreOrders(): Promise<{ preorder: PreOrder; rowIndex: number }[]> {
  const data = await getSheetData(SHEETS.PREORDERS);
  if (!data || data.length < 2) return [];

  const headers = data[0];
  const statusIdx = headers.indexOf('status');
  const results: { preorder: PreOrder; rowIndex: number }[] = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][statusIdx] === 'pending') {
      results.push({ preorder: rowToPreOrder(headers, data[i]), rowIndex: i + 1 });
    }
  }
  return results;
}

export async function getPreOrderBySlug(slug: string): Promise<PreOrder | null> {
  const data = await getSheetData(SHEETS.PREORDERS);
  if (!data || data.length < 2) return null;

  const headers = data[0];
  const slugIdx = headers.indexOf('slug');
  const statusIdx = headers.indexOf('status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][slugIdx] === slug && data[i][statusIdx] === 'pending') {
      return rowToPreOrder(headers, data[i]);
    }
  }
  return null;
}

export async function updatePreOrderStatus(
  rowIndex: number,
  status: string,
  fillPrice?: number,
  filledAt?: string
): Promise<void> {
  const sheets = getSheets();
  // status is column I (9th), fill_price is J, filled_at is N
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.PREORDERS}!I${rowIndex}:J${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[status, fillPrice || 0]],
    },
  });
  if (filledAt) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${SHEETS.PREORDERS}!N${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[filledAt]] },
    });
  }
}

// ===== Row conversion helpers =====

function rowToTrade(headers: string[], row: string[]): Trade {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = row[i] || ''; });
  return {
    id: obj.id,
    timestamp: obj.timestamp,
    market_id: obj.market_id,
    question: obj.question,
    slug: obj.slug,
    side: 'YES',
    entry_price: parseFloat(obj.entry_price) || 0,
    timeframe_min: parseInt(obj.timeframe_min) || 0,
    end_time: obj.end_time,
    amount_usd: parseFloat(obj.amount_usd) || 0,
    contracts: parseFloat(obj.contracts) || 0,
    tier: obj.tier,
    confidence_score: parseFloat(obj.confidence_score) || 0,
    status: obj.status as Trade['status'],
    resolution: obj.resolution,
    close_price: parseFloat(obj.close_price) || 0,
    pnl_gross: parseFloat(obj.pnl_gross) || 0,
    taker_fee: parseFloat(obj.taker_fee) || 0,
    gas_fee: parseFloat(obj.gas_fee) || 0,
    pnl_net: parseFloat(obj.pnl_net) || 0,
    bankroll_after: parseFloat(obj.bankroll_after) || 0,
    btc_price: parseFloat(obj.btc_price) || 0,
    rsi7: parseFloat(obj.rsi7) || 0,
    momentum_5m: parseFloat(obj.momentum_5m) || 0,
    adx: parseFloat(obj.adx) || 0,
    volume_ratio: parseFloat(obj.volume_ratio) || 0,
    chop: obj.chop === 'TRUE',
    regime: obj.regime || '',
    ai_decision: obj.ai_decision,
    ai_confidence: parseFloat(obj.ai_confidence) || 0,
    ai_reasoning: obj.ai_reasoning,
    exit_reason: obj.exit_reason || '',
    exit_price: parseFloat(obj.exit_price) || 0,
    savings_vs_hold: parseFloat(obj.savings_vs_hold) || 0,
    is_maker: obj.is_maker === 'TRUE',
    maker_rebate: parseFloat(obj.maker_rebate) || 0,
  };
}

function tradeToRow(t: Trade): (string | number | boolean)[] {
  return [
    t.id, t.timestamp, t.market_id, t.question, t.slug, t.side,
    t.entry_price, t.timeframe_min, t.end_time, t.amount_usd, t.contracts,
    t.tier, t.confidence_score, t.status, t.resolution, t.close_price,
    t.pnl_gross, t.taker_fee, t.gas_fee, t.pnl_net, t.bankroll_after,
    t.btc_price, t.rsi7, t.momentum_5m, t.adx, t.volume_ratio,
    t.chop ? 'TRUE' : 'FALSE', t.regime, t.ai_decision, t.ai_confidence, t.ai_reasoning,
    t.exit_reason || '', t.exit_price || 0, t.savings_vs_hold || 0,
    t.is_maker ? 'TRUE' : 'FALSE', t.maker_rebate || 0,
  ];
}

function rowToObservation(headers: string[], row: string[]): Observation {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = row[i] || ''; });
  return {
    id: obj.id,
    timestamp: obj.timestamp,
    market_id: obj.market_id,
    question: obj.question,
    timeframe_min: parseInt(obj.timeframe_min) || 0,
    end_time: obj.end_time,
    yes_price: parseFloat(obj.yes_price) || 0,
    no_price: parseFloat(obj.no_price) || 0,
    btc_price: parseFloat(obj.btc_price) || 0,
    rsi7: parseFloat(obj.rsi7) || 0,
    momentum_1m: parseFloat(obj.momentum_1m) || 0,
    momentum_5m: parseFloat(obj.momentum_5m) || 0,
    adx: parseFloat(obj.adx) || 0,
    volume_ratio: parseFloat(obj.volume_ratio) || 0,
    bb_width: parseFloat(obj.bb_width) || 0,
    vwap_distance: parseFloat(obj.vwap_distance) || 0,
    chop: obj.chop === 'TRUE',
    absorption: obj.absorption === 'TRUE',
    score: parseFloat(obj.score) || 0,
    tier: obj.tier,
    traded: obj.traded === 'TRUE',
    trade_id: obj.trade_id,
    skip_reason: obj.skip_reason,
    market_outcome: obj.market_outcome,
    current_window_yes_price: parseFloat(obj.current_window_yes_price) || 0,
    current_window_minutes_left: parseFloat(obj.current_window_minutes_left) || 0,
  };
}

function observationToRow(o: Observation): (string | number | boolean)[] {
  return [
    o.id, o.timestamp, o.market_id, o.question, o.timeframe_min, o.end_time,
    o.yes_price, o.no_price, o.btc_price, o.rsi7, o.momentum_1m, o.momentum_5m,
    o.adx, o.volume_ratio, o.bb_width, o.vwap_distance,
    o.chop ? 'TRUE' : 'FALSE', o.absorption ? 'TRUE' : 'FALSE',
    o.score, o.tier, o.traded ? 'TRUE' : 'FALSE', o.trade_id, o.skip_reason, o.market_outcome,
    o.current_window_yes_price || 0, o.current_window_minutes_left || 0,
  ];
}

function rowToDailyStats(headers: string[], row: string[]): DailyStats {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = row[i] || ''; });
  return {
    date: obj.date,
    trades_total: parseInt(obj.trades_total) || 0,
    trades_won: parseInt(obj.trades_won) || 0,
    trades_lost: parseInt(obj.trades_lost) || 0,
    win_rate: parseFloat(obj.win_rate) || 0,
    pnl_gross: parseFloat(obj.pnl_gross) || 0,
    pnl_net: parseFloat(obj.pnl_net) || 0,
    total_fees: parseFloat(obj.total_fees) || 0,
    bankroll_start: parseFloat(obj.bankroll_start) || 0,
    bankroll_end: parseFloat(obj.bankroll_end) || 0,
    base_yes_rate: parseFloat(obj.base_yes_rate) || 0,
    bot_alpha: parseFloat(obj.bot_alpha) || 0,
    observations: parseInt(obj.observations) || 0,
    regime: obj.regime,
    best_signal: obj.best_signal,
  };
}

function dailyStatsToRow(s: DailyStats): (string | number | boolean)[] {
  return [
    s.date, s.trades_total, s.trades_won, s.trades_lost, s.win_rate,
    s.pnl_gross, s.pnl_net, s.total_fees, s.bankroll_start, s.bankroll_end,
    s.base_yes_rate, s.bot_alpha, s.observations, s.regime, s.best_signal,
  ];
}

function rowToPreOrder(headers: string[], row: string[]): PreOrder {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = row[i] || ''; });
  return {
    id: obj.id,
    slug: obj.slug,
    market_id: obj.market_id || '',
    side: 'YES',
    limit_price: parseFloat(obj.limit_price) || 0,
    amount: parseFloat(obj.amount) || 0,
    window_start: obj.window_start,
    window_end: obj.window_end,
    status: obj.status as PreOrder['status'],
    fill_price: parseFloat(obj.fill_price) || 0,
    is_maker: obj.is_maker === 'TRUE',
    signal_score: parseFloat(obj.signal_score) || 0,
    placed_at: obj.placed_at,
    filled_at: obj.filled_at || '',
  };
}

function preOrderToRow(po: PreOrder): (string | number | boolean)[] {
  return [
    po.id, po.slug, po.market_id, po.side, po.limit_price, po.amount,
    po.window_start, po.window_end, po.status, po.fill_price,
    po.is_maker ? 'TRUE' : 'FALSE', po.signal_score, po.placed_at, po.filled_at,
  ];
}
