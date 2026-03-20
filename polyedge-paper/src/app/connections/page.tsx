'use client';

import { useState, useEffect } from 'react';

interface Endpoint {
  name: string;
  url: string;
  purpose: string;
  docs: string;
  auth: string;
  status: string;
  configured?: boolean;
  sheetId?: string;
  routes: { method: string; path: string; desc: string }[];
}

interface InternalRoute {
  method: string;
  path: string;
  desc: string;
  cron?: string;
}

export default function ConnectionsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [internalRoutes, setInternalRoutes] = useState<InternalRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(data => {
        setEndpoints(data.endpoints || []);
        setInternalRoutes(data.internalRoutes || []);
        setLoading(false);
      })
      .catch(e => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-gray-500">Checking connections...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">API Connections & Endpoints</h1>

      {/* External Services */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">External Services</h2>
        {endpoints.map((ep) => (
          <div key={ep.name} className="card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <StatusDot status={ep.status} />
                <span className="font-semibold">{ep.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                ep.status === 'connected' ? 'bg-green-900 text-green-300' :
                ep.status === 'enabled' ? 'bg-blue-900 text-blue-300' :
                ep.status === 'configured' ? 'bg-blue-900 text-blue-300' :
                ep.status === 'disabled' ? 'bg-gray-800 text-gray-400' :
                'bg-red-900 text-red-300'
              }`}>
                {ep.status}
              </span>
            </div>

            <div className="text-sm text-gray-400 mb-2">{ep.purpose}</div>

            <div className="bg-[#111] rounded px-3 py-2 mb-2 font-mono text-xs text-gray-300 break-all">
              {ep.url}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
              <div>
                <span className="text-gray-500">Auth:</span>{' '}
                <span className="text-gray-300">{ep.auth}</span>
              </div>
              <div>
                <span className="text-gray-500">Docs:</span>{' '}
                <a href={ep.docs} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                  {ep.docs}
                </a>
              </div>
              {ep.sheetId && (
                <div className="col-span-2">
                  <span className="text-gray-500">Sheet ID:</span>{' '}
                  <span className="text-gray-300 font-mono">{ep.sheetId}</span>
                </div>
              )}
            </div>

            {/* Routes used */}
            <div className="border-t border-[#2a2a2a] pt-2 mt-2">
              <div className="text-xs text-gray-500 mb-1">Endpoints used:</div>
              {ep.routes.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                  <span className={`font-mono px-1 rounded ${
                    r.method === 'GET' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'
                  }`}>
                    {r.method}
                  </span>
                  <span className="font-mono text-gray-300">{r.path}</span>
                  <span className="text-gray-500">— {r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Internal API Routes */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Internal API Routes (this app)</h2>
        <div className="card">
          <div className="space-y-1">
            {internalRoutes.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1 border-b border-[#1a1a1a] last:border-0">
                <span className={`font-mono px-1 rounded shrink-0 ${
                  r.method === 'GET' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'
                }`}>
                  {r.method}
                </span>
                <span className="font-mono text-gray-300 shrink-0">{r.path}</span>
                <span className="text-gray-500">{r.desc}</span>
                {r.cron && (
                  <span className="ml-auto text-yellow-400 font-mono shrink-0">{r.cron}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">QUICK LINKS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <a href="https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data"
            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Binance Klines API Docs
          </a>
          <a href="https://docs.polymarket.com/"
            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Polymarket API Docs
          </a>
          <a href="https://developers.google.com/sheets/api/quickstart/nodejs"
            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Google Sheets API Quickstart
          </a>
          <a href="https://platform.openai.com/docs/api-reference/chat/create"
            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            OpenAI Chat Completions
          </a>
          <a href="https://core.telegram.org/bots#how-do-i-create-a-bot"
            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Create Telegram Bot
          </a>
          <a href="https://support.discord.com/hc/en-us/articles/228383668"
            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Create Discord Webhook
          </a>
          <a href="https://console.cloud.google.com/apis/credentials"
            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Google Cloud Console (Service Accounts)
          </a>
          <a href="https://vercel.com/docs/cron-jobs"
            target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Vercel Cron Jobs Docs
          </a>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'connected' ? 'bg-green-400'
    : status === 'enabled' || status === 'configured' ? 'bg-blue-400'
    : status === 'disabled' ? 'bg-gray-600'
    : 'bg-red-400';

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color} ${
      status === 'connected' ? 'animate-pulse' : ''
    }`} />
  );
}
