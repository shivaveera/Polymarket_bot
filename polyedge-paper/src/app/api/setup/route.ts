import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { DEFAULT_SETTINGS, SHEETS, TRADE_HEADERS, OBSERVATION_HEADERS, DAILY_STATS_HEADERS, SIGNAL_WEIGHT_HEADERS, PREORDER_HEADERS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      return NextResponse.json({ error: 'GOOGLE_SHEET_ID not configured' }, { status: 500 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Get existing tabs
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingTabs = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    const tabsToCreate: { name: string; headers: string[] }[] = [
      { name: SHEETS.SETTINGS, headers: ['key', 'value'] },
      { name: SHEETS.TRADES, headers: TRADE_HEADERS },
      { name: SHEETS.OBSERVATIONS, headers: OBSERVATION_HEADERS },
      { name: SHEETS.DAILY_STATS, headers: DAILY_STATS_HEADERS },
      { name: SHEETS.SIGNAL_WEIGHTS, headers: SIGNAL_WEIGHT_HEADERS },
      { name: SHEETS.PREORDERS, headers: PREORDER_HEADERS },
    ];

    const created: string[] = [];
    const skipped: string[] = [];

    for (const tab of tabsToCreate) {
      if (existingTabs.includes(tab.name)) {
        skipped.push(tab.name);
        continue;
      }

      // Create the tab
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tab.name } } }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${tab.name}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [tab.headers] },
      });

      // For settings tab, populate default values
      if (tab.name === SHEETS.SETTINGS) {
        const settingsRows: string[][] = [];
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          const strValue = Array.isArray(value) ? value.join(',')
            : typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE')
            : String(value);
          settingsRows.push([key, strValue]);
        }
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: tab.name,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: settingsRows },
        });
      }

      created.push(tab.name);
    }

    return NextResponse.json({
      status: 'ok',
      created,
      skipped,
      message: created.length > 0
        ? `Created ${created.length} tabs with headers and defaults`
        : 'All tabs already exist',
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
