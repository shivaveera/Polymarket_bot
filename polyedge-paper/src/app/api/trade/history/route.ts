import { NextRequest, NextResponse } from 'next/server';
import { getRecentTrades, getAllTrades } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const trades = limit > 0 ? await getRecentTrades(limit) : await getAllTrades();
    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Trade history error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
