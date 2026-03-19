import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
