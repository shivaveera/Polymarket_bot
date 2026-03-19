import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Trigger the tick endpoint internally
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/cron/tick`, {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || ''}`,
      },
    });

    const data = await res.json();
    return NextResponse.json({ status: 'ok', tickResult: data });
  } catch (error) {
    console.error('Manual trigger error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
