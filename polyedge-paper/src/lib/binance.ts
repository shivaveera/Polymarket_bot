import { Candle } from '@/types';
import { BINANCE_API } from './constants';

export async function fetchCandles(
  symbol: string = 'BTCUSDT',
  interval: string = '1m',
  limit: number = 100
): Promise<Candle[]> {
  const url = `${BINANCE_API}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  return data.map((k: (string | number)[]) => ({
    openTime: Number(k[0]),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
    closeTime: Number(k[6]),
  }));
}

export async function getLatestPrice(symbol: string = 'BTCUSDT'): Promise<number> {
  const url = `${BINANCE_API}/api/v3/ticker/price?symbol=${symbol}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) {
    throw new Error(`Binance price API error: ${res.status}`);
  }

  const data = await res.json();
  return parseFloat(data.price);
}
