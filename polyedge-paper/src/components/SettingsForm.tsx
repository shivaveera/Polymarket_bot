'use client';

import { useState, useEffect } from 'react';
import { Settings } from '@/types';

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings/get')
      .then(r => r.json())
      .then(setSettings)
      .catch(console.error);
  }, []);

  async function save(updates: Partial<Settings>) {
    setSaving(true);
    try {
      await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setSettings(prev => prev ? { ...prev, ...updates } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  }

  if (!settings) return <div className="text-gray-500">Loading settings...</div>;

  return (
    <div className="space-y-6">
      {saved && (
        <div className="bg-green-900/50 text-green-300 px-4 py-2 rounded text-sm">
          Settings saved
        </div>
      )}

      {/* Master Toggle */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Trading Enabled</div>
            <div className="text-sm text-gray-400">Master on/off switch</div>
          </div>
          <button
            onClick={() => save({ trading_enabled: !settings.trading_enabled })}
            className={`px-6 py-3 rounded-lg font-bold text-lg ${
              settings.trading_enabled
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {settings.trading_enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Bankroll */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Position Sizing</h3>

        <SliderField
          label="Bankroll"
          value={settings.bankroll}
          min={1} max={100} step={1}
          format={v => `$${v}`}
          onChange={v => save({ bankroll: v })}
        />
        <SliderField
          label="Max Bet"
          value={settings.max_bet}
          min={0.5} max={10} step={0.5}
          format={v => `$${v.toFixed(2)}`}
          onChange={v => save({ max_bet: v })}
        />
        <SliderField
          label="Max Simultaneous Trades"
          value={settings.max_simultaneous}
          min={1} max={10} step={1}
          onChange={v => save({ max_simultaneous: v })}
        />
        <SliderField
          label="Max Trades/Hour"
          value={settings.max_trades_per_hour}
          min={5} max={100} step={5}
          onChange={v => save({ max_trades_per_hour: v })}
        />
      </div>

      {/* Scoring */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Signal Thresholds</h3>

        <SliderField
          label="Entry Price Max"
          value={settings.entry_price_max}
          min={0.55} max={0.95} step={0.05}
          format={v => `$${v.toFixed(2)}`}
          onChange={v => save({ entry_price_max: v })}
        />
        <SliderField
          label="Tier 1 Threshold (Auto-Trade)"
          value={settings.tier1_threshold}
          min={20} max={35} step={1}
          format={v => `${v}/35`}
          onChange={v => save({ tier1_threshold: v })}
        />
        <SliderField
          label="Tier 2 Threshold (AI Review)"
          value={settings.tier2_threshold}
          min={10} max={25} step={1}
          format={v => `${v}/35`}
          onChange={v => save({ tier2_threshold: v })}
        />
      </div>

      {/* AI */}
      <div className="card space-y-4">
        <h3 className="font-semibold">AI Validation</h3>

        <div className="flex items-center justify-between">
          <span className="text-sm">AI Enabled</span>
          <button
            onClick={() => save({ ai_enabled: !settings.ai_enabled })}
            className={`px-3 py-1 rounded text-sm ${
              settings.ai_enabled ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {settings.ai_enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {settings.ai_enabled && (
          <SliderField
            label="AI Confidence Min"
            value={settings.ai_confidence_min}
            min={40} max={90} step={5}
            format={v => `${v}%`}
            onChange={v => save({ ai_confidence_min: v })}
          />
        )}
      </div>

      {/* Pre-Orders (Maker) */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Pre-Orders (Maker)</h3>
        <div className="text-xs text-gray-400 mb-2">
          Place limit orders on the NEXT window before it opens. 0% maker fee + daily rebate.
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Pre-Orders Enabled</span>
          <button
            onClick={() => save({ preorder_enabled: !settings.preorder_enabled })}
            className={`px-3 py-1 rounded text-sm ${
              settings.preorder_enabled ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {settings.preorder_enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {settings.preorder_enabled && (
          <>
            <SliderField
              label="Place Before (seconds)"
              value={settings.preorder_before_seconds}
              min={60} max={300} step={30}
              format={v => `${v}s`}
              onChange={v => save({ preorder_before_seconds: v })}
            />
            <SliderField
              label="Skip if Current Window YES >"
              value={settings.preorder_skip_if_clear}
              min={0.70} max={0.95} step={0.05}
              format={v => `$${v.toFixed(2)}`}
              onChange={v => save({ preorder_skip_if_clear: v })}
            />
          </>
        )}
      </div>

      {/* Early Exit */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Early Exit</h3>
        <div className="text-xs text-gray-400 mb-2">
          Exit trades early when YES price deteriorates, capping losses at $0.30-0.50 instead of ~$2.00.
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Early Exit Enabled</span>
          <button
            onClick={() => save({ early_exit_enabled: !settings.early_exit_enabled })}
            className={`px-3 py-1 rounded text-sm ${
              settings.early_exit_enabled ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {settings.early_exit_enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {settings.early_exit_enabled && (
          <>
            <SliderField
              label="Danger Price (exit if YES below)"
              value={settings.danger_price}
              min={0.20} max={0.45} step={0.01}
              format={v => `$${v.toFixed(2)}`}
              onChange={v => save({ danger_price: v })}
            />
            <SliderField
              label="Danger Time (minutes)"
              value={settings.danger_time_minutes}
              min={2} max={10} step={1}
              format={v => `${v}m`}
              onChange={v => save({ danger_time_minutes: v })}
            />
            <SliderField
              label="Danger Time Price"
              value={settings.danger_time_price}
              min={0.40} max={0.50} step={0.01}
              format={v => `$${v.toFixed(2)}`}
              onChange={v => save({ danger_time_price: v })}
            />
            <SliderField
              label="No Exit Final Seconds"
              value={settings.no_exit_final_seconds}
              min={30} max={120} step={15}
              format={v => `${v}s`}
              onChange={v => save({ no_exit_final_seconds: v })}
            />
          </>
        )}
      </div>

      {/* Timeframes */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Timeframes</h3>
        <div className="flex gap-3">
          {[5, 15].map(tf => (
            <button
              key={tf}
              onClick={() => {
                const current = settings.timeframes;
                const next = current.includes(tf)
                  ? current.filter(t => t !== tf)
                  : [...current, tf];
                if (next.length > 0) save({ timeframes: next });
              }}
              className={`px-4 py-2 rounded text-sm ${
                settings.timeframes.includes(tf) ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {tf}m
            </button>
          ))}
        </div>
      </div>

      {/* Circuit Breaker */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Circuit Breaker</h3>
        <div className="text-xs text-gray-400 mb-2">
          Auto-pauses trading on loss streaks or drawdown. Sends alert via Telegram/Discord.
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Circuit Breaker Enabled</span>
          <button
            onClick={() => save({ circuit_breaker_enabled: !settings.circuit_breaker_enabled })}
            className={`px-3 py-1 rounded text-sm ${
              settings.circuit_breaker_enabled ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {settings.circuit_breaker_enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {settings.circuit_breaker_enabled && (
          <>
            <SliderField
              label="Max Consecutive Losses"
              value={settings.max_consecutive_losses}
              min={2} max={10} step={1}
              onChange={v => save({ max_consecutive_losses: v })}
            />
            <SliderField
              label="Max Drawdown %"
              value={settings.max_drawdown_pct}
              min={5} max={50} step={5}
              format={v => `${v}%`}
              onChange={v => save({ max_drawdown_pct: v })}
            />
          </>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Peak Bankroll</span>
          <span className="font-mono">${settings.peak_bankroll.toFixed(2)}</span>
        </div>
      </div>

      {/* Notifications */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Notifications</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Telegram</span>
            <button
              onClick={() => save({ telegram_enabled: !settings.telegram_enabled })}
              className={`px-3 py-1 rounded text-sm ${
                settings.telegram_enabled ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {settings.telegram_enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {settings.telegram_enabled && (
            <div className="space-y-2">
              <TextInput
                label="Bot Token"
                value={settings.telegram_bot_token}
                placeholder="123456:ABC-DEF..."
                onChange={v => save({ telegram_bot_token: v })}
              />
              <TextInput
                label="Chat ID"
                value={settings.telegram_chat_id}
                placeholder="-1001234567890"
                onChange={v => save({ telegram_chat_id: v })}
              />
            </div>
          )}
        </div>

        <div className="border-t border-[#2a2a2a] pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Discord</span>
            <button
              onClick={() => save({ discord_enabled: !settings.discord_enabled })}
              className={`px-3 py-1 rounded text-sm ${
                settings.discord_enabled ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {settings.discord_enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {settings.discord_enabled && (
            <TextInput
              label="Webhook URL"
              value={settings.discord_webhook_url}
              placeholder="https://discord.com/api/webhooks/..."
              onChange={v => save({ discord_webhook_url: v })}
            />
          )}
        </div>
      </div>

      {/* Fees */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Simulation Fees</h3>
        <SliderField
          label="Simulated Gas Fee"
          value={settings.sim_gas_fee}
          min={0} max={0.05} step={0.001}
          format={v => `$${v.toFixed(3)}`}
          onChange={v => save({ sim_gas_fee: v })}
        />
        <SliderField
          label="Taker Fee Rate"
          value={settings.sim_taker_fee_rate}
          min={0} max={0.05} step={0.005}
          format={v => `${(v * 100).toFixed(1)}%`}
          onChange={v => save({ sim_taker_fee_rate: v })}
        />
      </div>

      {saving && <div className="text-gray-400 text-sm">Saving...</div>}
    </div>
  );
}

function TextInput({
  label, value, placeholder, onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <input
        type="text"
        value={local}
        placeholder={placeholder}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onChange(local); }}
        className="w-full bg-[#111] border border-[#333] rounded px-3 py-1.5 text-sm font-mono"
      />
    </div>
  );
}

function SliderField({
  label, value, min, max, step, format, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono">{format ? format(local) : local}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={local}
        onChange={e => setLocal(parseFloat(e.target.value))}
        onMouseUp={() => onChange(local)}
        onTouchEnd={() => onChange(local)}
        className="w-full accent-blue-500"
      />
    </div>
  );
}
