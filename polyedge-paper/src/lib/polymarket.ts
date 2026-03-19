import { PolymarketMarket } from '@/types';
import { POLYMARKET_GAMMA_API } from './constants';

export async function fetchBTCMarkets(): Promise<PolymarketMarket[]> {
  const url = `${POLYMARKET_GAMMA_API}/markets?tag=crypto&closed=false&limit=50`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) {
    throw new Error(`Polymarket API error: ${res.status}`);
  }

  const data = await res.json();
  const markets: PolymarketMarket[] = [];

  for (const m of data) {
    const question = (m.question || '').toLowerCase();
    // Filter for BTC price up/down markets
    if (!question.includes('btc') && !question.includes('bitcoin')) continue;
    if (!question.includes('above') && !question.includes('below') && !question.includes('up') && !question.includes('down')) continue;

    const endDate = m.endDate || m.end_date_iso || '';
    if (!endDate) continue;

    // Skip markets that have already ended
    if (new Date(endDate) <= new Date()) continue;

    const outcomePrices = parseOutcomePrices(m);

    markets.push({
      id: m.id || m.condition_id || '',
      question: m.question || '',
      slug: m.slug || '',
      endDate,
      yesPrice: outcomePrices.yes,
      noPrice: outcomePrices.no,
      active: m.active !== false,
      volume: parseFloat(m.volume || '0'),
      liquidity: parseFloat(m.liquidity || '0'),
    });
  }

  return markets;
}

function parseOutcomePrices(market: Record<string, unknown>): { yes: number; no: number } {
  // Gamma API returns outcomePrices as a string like "[0.505, 0.495]" or as an object
  let yes = 0.5;
  let no = 0.5;

  if (market.outcomePrices) {
    try {
      const prices = typeof market.outcomePrices === 'string'
        ? JSON.parse(market.outcomePrices)
        : market.outcomePrices;
      if (Array.isArray(prices)) {
        yes = parseFloat(prices[0]) || 0.5;
        no = parseFloat(prices[1]) || 0.5;
      }
    } catch {
      // fallback
    }
  }

  if (market.bestAsk !== undefined) {
    yes = parseFloat(market.bestAsk as string) || yes;
  }

  return { yes, no };
}

export async function checkMarketResolution(marketId: string): Promise<{
  resolved: boolean;
  outcome: 'YES' | 'NO' | null;
}> {
  const url = `${POLYMARKET_GAMMA_API}/markets/${marketId}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) {
    return { resolved: false, outcome: null };
  }

  const data = await res.json();

  if (data.closed || data.resolved) {
    const outcome = data.outcome || data.resolution;
    if (outcome === 'Yes' || outcome === '1' || outcome === 'YES') {
      return { resolved: true, outcome: 'YES' };
    }
    if (outcome === 'No' || outcome === '0' || outcome === 'NO') {
      return { resolved: true, outcome: 'NO' };
    }
    // Market closed but resolution unclear — check end time
    if (new Date(data.endDate || data.end_date_iso || '') < new Date()) {
      return { resolved: true, outcome: null };
    }
  }

  return { resolved: false, outcome: null };
}

export function getTimeframeFromMarket(market: PolymarketMarket): number {
  const endTime = new Date(market.endDate).getTime();
  const now = Date.now();
  const minutesUntilEnd = (endTime - now) / (1000 * 60);

  if (minutesUntilEnd <= 7) return 5;
  if (minutesUntilEnd <= 20) return 15;
  return Math.round(minutesUntilEnd);
}
