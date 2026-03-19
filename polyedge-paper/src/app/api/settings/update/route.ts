import { NextRequest, NextResponse } from 'next/server';
import { updateSettings } from '@/lib/sheets';
import { Settings } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const updates: Partial<Settings> = await req.json();
    await updateSettings(updates);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
