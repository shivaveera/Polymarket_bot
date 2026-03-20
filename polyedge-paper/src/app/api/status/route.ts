import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/sheets';
import { BINANCE_API, POLYMARKET_GAMMA_API } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSettings();

    // Ping each external service
    const checks = await Promise.allSettled([
      fetch(`${BINANCE_API}/api/v3/ping`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${POLYMARKET_GAMMA_API}/markets?limit=1`, { signal: AbortSignal.timeout(5000) }),
    ]);

    const binanceOk = checks[0].status === 'fulfilled' && checks[0].value.ok;
    const polymarketOk = checks[1].status === 'fulfilled' && checks[1].value.ok;

    const endpoints = [
      {
        name: 'Binance REST API',
        url: BINANCE_API,
        purpose: 'BTC 1m candle data + live price',
        docs: 'https://binance-docs.github.io/apidocs/spot/en/',
        auth: 'None (public)',
        status: binanceOk ? 'connected' : 'error',
        routes: [
          { method: 'GET', path: '/api/v3/klines', desc: 'Fetch candlestick data' },
          { method: 'GET', path: '/api/v3/ticker/price', desc: 'Latest BTC price' },
        ],
      },
      {
        name: 'Polymarket Gamma API',
        url: POLYMARKET_GAMMA_API,
        purpose: 'BTC prediction markets + odds + resolution',
        docs: 'https://docs.polymarket.com/',
        auth: 'None (public)',
        status: polymarketOk ? 'connected' : 'error',
        routes: [
          { method: 'GET', path: '/markets?tag=crypto&closed=false', desc: 'Fetch active BTC markets' },
          { method: 'GET', path: '/markets/{id}', desc: 'Check market resolution' },
        ],
      },
      {
        name: 'Google Sheets API',
        url: 'https://sheets.googleapis.com/v4/spreadsheets',
        purpose: 'Database — all trades, settings, observations, stats',
        docs: 'https://developers.google.com/sheets/api/reference/rest',
        auth: 'Service Account (GOOGLE_SERVICE_ACCOUNT_EMAIL)',
        status: 'configured',
        configured: !!process.env.GOOGLE_SHEET_ID,
        sheetId: process.env.GOOGLE_SHEET_ID ? `...${process.env.GOOGLE_SHEET_ID.slice(-8)}` : 'not set',
        routes: [
          { method: 'GET', path: '/values/{range}', desc: 'Read sheet data' },
          { method: 'POST', path: '/values/{range}:append', desc: 'Append rows' },
          { method: 'PUT', path: '/values/{range}', desc: 'Update cells' },
        ],
      },
      {
        name: 'OpenAI API',
        url: 'https://api.openai.com/v1',
        purpose: 'AI validation for Tier 2 signals (gpt-4o-mini)',
        docs: 'https://platform.openai.com/docs/api-reference',
        auth: 'API Key (OPENAI_API_KEY)',
        status: settings.ai_enabled ? 'enabled' : 'disabled',
        configured: !!process.env.OPENAI_API_KEY,
        routes: [
          { method: 'POST', path: '/chat/completions', desc: 'Validate trade signals' },
        ],
      },
      {
        name: 'Telegram Bot API',
        url: settings.telegram_bot_token
          ? `https://api.telegram.org/bot${settings.telegram_bot_token.slice(0, 6)}***/sendMessage`
          : 'https://api.telegram.org/bot{token}/sendMessage',
        purpose: 'Trade notifications, circuit breaker alerts, daily summaries',
        docs: 'https://core.telegram.org/bots/api',
        auth: 'Bot Token (from settings)',
        status: settings.telegram_enabled && settings.telegram_bot_token ? 'enabled' : 'disabled',
        configured: !!settings.telegram_bot_token && !!settings.telegram_chat_id,
        routes: [
          { method: 'POST', path: '/sendMessage', desc: 'Send notification' },
        ],
      },
      {
        name: 'Discord Webhook',
        url: settings.discord_webhook_url
          ? settings.discord_webhook_url.replace(/\/[\w-]+$/, '/***')
          : 'https://discord.com/api/webhooks/{id}/{token}',
        purpose: 'Trade notifications, circuit breaker alerts, daily summaries',
        docs: 'https://discord.com/developers/docs/resources/webhook',
        auth: 'Webhook URL (from settings)',
        status: settings.discord_enabled && settings.discord_webhook_url ? 'enabled' : 'disabled',
        configured: !!settings.discord_webhook_url,
        routes: [
          { method: 'POST', path: '/', desc: 'Send notification' },
        ],
      },
    ];

    const internalRoutes = [
      { method: 'GET', path: '/api/cron/tick', desc: 'Main trading loop — runs every 1 min', cron: '* * * * *' },
      { method: 'GET', path: '/api/cron/resolve', desc: 'Check open trades for resolution — every 1 min', cron: '* * * * *' },
      { method: 'GET', path: '/api/cron/research', desc: 'Daily stats + analysis — daily at 6 UTC', cron: '0 6 * * *' },
      { method: 'GET', path: '/api/settings/get', desc: 'Read all settings from Google Sheets' },
      { method: 'POST', path: '/api/settings/update', desc: 'Update settings in Google Sheets' },
      { method: 'GET', path: '/api/trade/history', desc: 'Fetch trade history (with ?limit=N)' },
      { method: 'GET', path: '/api/trade/stats', desc: 'Dashboard stats — bankroll, win rate, PnL' },
      { method: 'POST', path: '/api/manual/trigger', desc: 'Manual tick trigger button' },
      { method: 'GET', path: '/api/status', desc: 'This endpoint — API health check' },
    ];

    return NextResponse.json({ endpoints, internalRoutes });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
