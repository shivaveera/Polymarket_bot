import { Settings, Trade } from '@/types';

export async function sendTradeNotification(trade: Trade, settings: Settings): Promise<void> {
  const emoji = trade.status === 'won' ? '✅' : trade.status === 'lost' ? '❌' : '📊';
  const pnlStr = trade.pnl_net >= 0 ? `+$${trade.pnl_net.toFixed(2)}` : `-$${Math.abs(trade.pnl_net).toFixed(2)}`;

  const lines = [
    `${emoji} *Trade ${trade.status === 'open' ? 'Opened' : trade.status.toUpperCase()}*`,
    `Market: ${trade.question}`,
    `Side: YES @ $${trade.entry_price.toFixed(3)}`,
    `Amount: $${trade.amount_usd.toFixed(2)}`,
    `Tier: ${trade.tier} | Score: ${trade.confidence_score}/35`,
    `Regime: ${trade.regime || 'unknown'}`,
  ];

  if (trade.status !== 'open') {
    lines.push(`PnL: ${pnlStr} (fee $${trade.taker_fee.toFixed(3)}, gas $${trade.gas_fee.toFixed(3)})`);
    lines.push(`Bankroll: $${trade.bankroll_after.toFixed(2)}`);
  }

  const message = lines.join('\n');

  await Promise.allSettled([
    settings.telegram_enabled ? sendTelegram(message, settings) : Promise.resolve(),
    settings.discord_enabled ? sendDiscord(message, settings) : Promise.resolve(),
  ]);
}

export async function sendCircuitBreakerAlert(reason: string, settings: Settings): Promise<void> {
  const message = [
    '🚨 *CIRCUIT BREAKER TRIPPED*',
    `Reason: ${reason}`,
    `Bankroll: $${settings.bankroll.toFixed(2)}`,
    `Peak: $${settings.peak_bankroll.toFixed(2)}`,
    '',
    'Trading has been auto-paused. Re-enable manually in Settings.',
  ].join('\n');

  await Promise.allSettled([
    settings.telegram_enabled ? sendTelegram(message, settings) : Promise.resolve(),
    settings.discord_enabled ? sendDiscord(message, settings) : Promise.resolve(),
  ]);
}

export async function sendDailySummary(params: {
  date: string;
  trades: number;
  won: number;
  lost: number;
  winRate: number;
  pnl: number;
  bankroll: number;
  alpha: number;
  regime: string;
}, settings: Settings): Promise<void> {
  const { date, trades, won, lost, winRate, pnl, bankroll, alpha, regime } = params;
  const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;

  const message = [
    `📈 *Daily Summary — ${date}*`,
    `Trades: ${trades} (${won}W / ${lost}L)`,
    `Win Rate: ${winRate.toFixed(1)}%`,
    `PnL: ${pnlStr}`,
    `Alpha: ${alpha >= 0 ? '+' : ''}${alpha.toFixed(1)}%`,
    `Regime: ${regime}`,
    `Bankroll: $${bankroll.toFixed(2)}`,
  ].join('\n');

  await Promise.allSettled([
    settings.telegram_enabled ? sendTelegram(message, settings) : Promise.resolve(),
    settings.discord_enabled ? sendDiscord(message, settings) : Promise.resolve(),
  ]);
}

async function sendTelegram(text: string, settings: Settings): Promise<void> {
  if (!settings.telegram_bot_token || !settings.telegram_chat_id) return;

  try {
    const url = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error('Telegram send failed:', res.status, await res.text());
    }
  } catch (error) {
    console.error('Telegram error:', error);
  }
}

async function sendDiscord(text: string, settings: Settings): Promise<void> {
  if (!settings.discord_webhook_url) return;

  // Convert Markdown bold (*text*) to Discord bold (**text**)
  const discordText = text.replace(/\*([^*]+)\*/g, '**$1**');

  try {
    const res = await fetch(settings.discord_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: discordText }),
    });
    if (!res.ok) {
      console.error('Discord send failed:', res.status, await res.text());
    }
  } catch (error) {
    console.error('Discord error:', error);
  }
}
