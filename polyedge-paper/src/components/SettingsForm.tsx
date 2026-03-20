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

      {/* Position Sizing */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Position Sizing</h3>
        <SliderField label="Bankroll" value={settings.bankroll} min={1} max={100} step={1} format={v => `$${v}`} onChange={v => save({ bankroll: v })} />
        <SliderField label="Max Bet" value={settings.max_bet} min={0.5} max={10} step={0.5} format={v => `$${v.toFixed(2)}`} onChange={v => save({ max_bet: v })} />
        <SliderField label="Max Simultaneous Trades" value={settings.max_simultaneous} min={1} max={10} step={1} onChange={v => save({ max_simultaneous: v })} />
        <SliderField label="Max Trades/Hour" value={settings.max_trades_per_hour} min={5} max={100} step={5} onChange={v => save({ max_trades_per_hour: v })} />
      </div>

      {/* Signal Thresholds */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Signal Thresholds</h3>
        <SliderField label="Entry Price Max" value={settings.entry_price_max} min={0.55} max={0.95} step={0.05} format={v => `$${v.toFixed(2)}`} onChange={v => save({ entry_price_max: v })} />
        <SliderField label="Tier 1 Threshold (Auto-Trade)" value={settings.tier1_threshold} min={20} max={35} step={1} format={v => `${v}/35`} onChange={v => save({ tier1_threshold: v })} />
        <SliderField label="Tier 2 Threshold (AI Review)" value={settings.tier2_threshold} min={10} max={25} step={1} format={v => `${v}/35`} onChange={v => save({ tier2_threshold: v })} />
      </div>

      {/* === DEFENSIVE STRATEGIES (Day 1-3) === */}
      <div className="text-xs uppercase text-gray-500 font-semibold tracking-wider pt-2">Defensive Strategies</div>

      {/* Strategy F: ADX Hard Gate */}
      <ToggleCard
        title="ADX Hard Gate"
        description="Instant SKIP when ADX <= 25. Below 25: 49% YES rate (coin flip). Above 25: 89% YES rate."
        enabled={settings.adx_hard_gate_enabled}
        onToggle={() => save({ adx_hard_gate_enabled: !settings.adx_hard_gate_enabled })}
      />

      {/* Strategy J: Trade Cooldown */}
      <ToggleCard
        title="Trade Cooldown"
        description="Max 1 trade per window per timeframe. Prevents correlated bets on the same signal."
        enabled={settings.cooldown_enabled}
        onToggle={() => save({ cooldown_enabled: !settings.cooldown_enabled })}
      />

      {/* Strategy D: Window Delta */}
      <ToggleCard
        title="Window Delta (Primary Signal)"
        description="Uses actual BTC delta from window open price as THE primary signal. +15 for >0.10%, +10 for >0.05%. SKIP if delta < -0.05%."
        enabled={settings.window_delta_enabled}
        onToggle={() => save({ window_delta_enabled: !settings.window_delta_enabled })}
      />

      {/* Strategy G: Momentum Cliff */}
      <ToggleCard
        title="Momentum Cliff at 0.15%"
        description="Phase transition: below 0.15% is coin flip. Above = 96.3% YES rate. +12 for CLIFF_BULL, -10 for BEARISH."
        enabled={settings.momentum_cliff_enabled}
        onToggle={() => save({ momentum_cliff_enabled: !settings.momentum_cliff_enabled })}
      />

      {/* Strategy H: Loss Signature */}
      <ToggleCard
        title="Loss Signature Pattern Match"
        description="Auto-skip when 2 of 3 loss conditions present: negative momentum, ADX < 25, BBWidth < 0.50."
        enabled={settings.loss_signature_enabled}
        onToggle={() => save({ loss_signature_enabled: !settings.loss_signature_enabled })}
      />

      {/* Strategy I: Regime Tracking */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Regime-Aware Base Rate</div>
            <div className="text-xs text-gray-400">Track rolling YES base rate. Auto-pause when strategy becomes negative EV.</div>
          </div>
          <ToggleButton enabled={settings.regime_tracking_enabled} onToggle={() => save({ regime_tracking_enabled: !settings.regime_tracking_enabled })} />
        </div>
        {settings.regime_tracking_enabled && (
          <>
            <SliderField label="Regime Window (observations)" value={settings.regime_window} min={20} max={100} step={10} onChange={v => save({ regime_window: v })} />
            <SliderField label="Auto-Pause Below Base Rate" value={settings.auto_pause_below_base_rate} min={0.30} max={0.60} step={0.05} format={v => `${(v * 100).toFixed(0)}%`} onChange={v => save({ auto_pause_below_base_rate: v })} />
          </>
        )}
      </div>

      {/* === OFFENSIVE STRATEGIES (Week 2+) === */}
      <div className="text-xs uppercase text-gray-500 font-semibold tracking-wider pt-2">Offensive Strategies</div>

      {/* Strategy B: Flash Crash Buy */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Flash Crash Buy</div>
            <div className="text-xs text-gray-400">{"Buy YES when price crashes > threshold in one tick but BTC hasn't actually moved."}</div>
          </div>
          <ToggleButton enabled={settings.flash_crash_enabled} onToggle={() => save({ flash_crash_enabled: !settings.flash_crash_enabled })} />
        </div>
        {settings.flash_crash_enabled && (
          <>
            <SliderField label="Drop Threshold" value={settings.flash_crash_drop_threshold} min={0.05} max={0.30} step={0.01} format={v => `$${v.toFixed(2)}`} onChange={v => save({ flash_crash_drop_threshold: v })} />
            <SliderField label="Size Multiplier" value={settings.flash_crash_size_multiplier} min={0.5} max={2.0} step={0.1} format={v => `${v}x`} onChange={v => save({ flash_crash_size_multiplier: v })} />
          </>
        )}
      </div>

      {/* Strategy C: Streak Reversal */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Streak Reversal</div>
            <div className="text-xs text-gray-400">Adjust score based on recent outcome streaks. 5 YES in a row = caution.</div>
          </div>
          <ToggleButton enabled={settings.streak_tracking_enabled} onToggle={() => save({ streak_tracking_enabled: !settings.streak_tracking_enabled })} />
        </div>
        {settings.streak_tracking_enabled && (
          <>
            <SliderField label="Streak Length" value={settings.streak_length} min={3} max={8} step={1} onChange={v => save({ streak_length: v })} />
            <SliderField label="YES Streak Penalty" value={Math.abs(settings.streak_penalty)} min={1} max={10} step={1} format={v => `-${v}`} onChange={v => save({ streak_penalty: -v })} />
            <SliderField label="NO Streak Bonus" value={settings.streak_bonus} min={1} max={10} step={1} format={v => `+${v}`} onChange={v => save({ streak_bonus: v })} />
          </>
        )}
      </div>

      {/* Strategy E: Oracle Check */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Oracle Price Check</div>
            <div className="text-xs text-gray-400">Compare Binance vs oracle price. Polymarket resolves on Chainlink, not Binance.</div>
          </div>
          <ToggleButton enabled={settings.oracle_check_enabled} onToggle={() => save({ oracle_check_enabled: !settings.oracle_check_enabled })} />
        </div>
        {settings.oracle_check_enabled && (
          <SliderField label="Divergence Threshold %" value={settings.oracle_divergence_threshold} min={0.03} max={0.20} step={0.01} format={v => `${(v).toFixed(2)}%`} onChange={v => save({ oracle_divergence_threshold: v })} />
        )}
      </div>

      {/* Strategy A: Endcycle Sniper */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Endcycle Sniper</div>
            <div className="text-xs text-gray-400">Last 30s of window, YES &gt; $0.90, score &gt;= 30. Tiny bet, ~95% accuracy.</div>
          </div>
          <ToggleButton enabled={settings.endcycle_sniper_enabled} onToggle={() => save({ endcycle_sniper_enabled: !settings.endcycle_sniper_enabled })} />
        </div>
        {settings.endcycle_sniper_enabled && (
          <>
            <SliderField label="Min YES Price" value={settings.endcycle_min_price} min={0.80} max={0.97} step={0.01} format={v => `$${v.toFixed(2)}`} onChange={v => save({ endcycle_min_price: v })} />
            <SliderField label="Max Seconds Before End" value={settings.endcycle_max_seconds} min={10} max={60} step={5} format={v => `${v}s`} onChange={v => save({ endcycle_max_seconds: v })} />
            <SliderField label="Size Multiplier" value={settings.endcycle_size_multiplier} min={0.1} max={0.5} step={0.05} format={v => `${v}x`} onChange={v => save({ endcycle_size_multiplier: v })} />
          </>
        )}
      </div>

      {/* Pre-Orders */}
      <div className="text-xs uppercase text-gray-500 font-semibold tracking-wider pt-2">Execution</div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Pre-Orders (Maker)</div>
            <div className="text-xs text-gray-400">0% maker fee + daily rebate. Place limit orders on NEXT window.</div>
          </div>
          <ToggleButton enabled={settings.preorder_enabled} onToggle={() => save({ preorder_enabled: !settings.preorder_enabled })} />
        </div>
        {settings.preorder_enabled && (
          <>
            <SliderField label="Place Before (seconds)" value={settings.preorder_before_seconds} min={60} max={300} step={30} format={v => `${v}s`} onChange={v => save({ preorder_before_seconds: v })} />
            <SliderField label="Skip if Current YES >" value={settings.preorder_skip_if_clear} min={0.70} max={0.95} step={0.05} format={v => `$${v.toFixed(2)}`} onChange={v => save({ preorder_skip_if_clear: v })} />
          </>
        )}
      </div>

      {/* Early Exit */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Early Exit</div>
            <div className="text-xs text-gray-400">Cap losses at $0.30-0.50 instead of ~$2.00 by selling when YES deteriorates.</div>
          </div>
          <ToggleButton enabled={settings.early_exit_enabled} onToggle={() => save({ early_exit_enabled: !settings.early_exit_enabled })} />
        </div>
        {settings.early_exit_enabled && (
          <>
            <SliderField label="Danger Price" value={settings.danger_price} min={0.20} max={0.45} step={0.01} format={v => `$${v.toFixed(2)}`} onChange={v => save({ danger_price: v })} />
            <SliderField label="Danger Time (min)" value={settings.danger_time_minutes} min={2} max={10} step={1} format={v => `${v}m`} onChange={v => save({ danger_time_minutes: v })} />
            <SliderField label="Danger Time Price" value={settings.danger_time_price} min={0.40} max={0.50} step={0.01} format={v => `$${v.toFixed(2)}`} onChange={v => save({ danger_time_price: v })} />
            <SliderField label="No Exit Final Seconds" value={settings.no_exit_final_seconds} min={30} max={120} step={15} format={v => `${v}s`} onChange={v => save({ no_exit_final_seconds: v })} />
          </>
        )}
      </div>

      {/* AI */}
      <div className="text-xs uppercase text-gray-500 font-semibold tracking-wider pt-2">AI & Safety</div>

      <div className="card space-y-4">
        <h3 className="font-semibold">AI Validation</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">AI Enabled</span>
          <ToggleButton enabled={settings.ai_enabled} onToggle={() => save({ ai_enabled: !settings.ai_enabled })} />
        </div>
        {settings.ai_enabled && (
          <SliderField label="AI Confidence Min" value={settings.ai_confidence_min} min={40} max={90} step={5} format={v => `${v}%`} onChange={v => save({ ai_confidence_min: v })} />
        )}
      </div>

      {/* Circuit Breaker */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Circuit Breaker</div>
            <div className="text-xs text-gray-400">Auto-pauses trading on loss streaks or drawdown.</div>
          </div>
          <ToggleButton enabled={settings.circuit_breaker_enabled} onToggle={() => save({ circuit_breaker_enabled: !settings.circuit_breaker_enabled })} />
        </div>
        {settings.circuit_breaker_enabled && (
          <>
            <SliderField label="Max Consecutive Losses" value={settings.max_consecutive_losses} min={2} max={10} step={1} onChange={v => save({ max_consecutive_losses: v })} />
            <SliderField label="Max Drawdown %" value={settings.max_drawdown_pct} min={5} max={50} step={5} format={v => `${v}%`} onChange={v => save({ max_drawdown_pct: v })} />
          </>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Peak Bankroll</span>
          <span className="font-mono">${settings.peak_bankroll.toFixed(2)}</span>
        </div>
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
                const next = current.includes(tf) ? current.filter(t => t !== tf) : [...current, tf];
                if (next.length > 0) save({ timeframes: next });
              }}
              className={`px-4 py-2 rounded text-sm ${settings.timeframes.includes(tf) ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              {tf}m
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Telegram</span>
            <ToggleButton enabled={settings.telegram_enabled} onToggle={() => save({ telegram_enabled: !settings.telegram_enabled })} />
          </div>
          {settings.telegram_enabled && (
            <div className="space-y-2">
              <TextInput label="Bot Token" value={settings.telegram_bot_token} placeholder="123456:ABC-DEF..." onChange={v => save({ telegram_bot_token: v })} />
              <TextInput label="Chat ID" value={settings.telegram_chat_id} placeholder="-1001234567890" onChange={v => save({ telegram_chat_id: v })} />
            </div>
          )}
        </div>
        <div className="border-t border-[#2a2a2a] pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Discord</span>
            <ToggleButton enabled={settings.discord_enabled} onToggle={() => save({ discord_enabled: !settings.discord_enabled })} />
          </div>
          {settings.discord_enabled && (
            <TextInput label="Webhook URL" value={settings.discord_webhook_url} placeholder="https://discord.com/api/webhooks/..." onChange={v => save({ discord_webhook_url: v })} />
          )}
        </div>
      </div>

      {/* Fees */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Simulation Fees</h3>
        <SliderField label="Simulated Gas Fee" value={settings.sim_gas_fee} min={0} max={0.05} step={0.001} format={v => `$${v.toFixed(3)}`} onChange={v => save({ sim_gas_fee: v })} />
        <SliderField label="Taker Fee Rate" value={settings.sim_taker_fee_rate} min={0} max={0.05} step={0.005} format={v => `${(v * 100).toFixed(1)}%`} onChange={v => save({ sim_taker_fee_rate: v })} />
      </div>

      {saving && <div className="text-gray-400 text-sm">Saving...</div>}
    </div>
  );
}

function ToggleButton({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded text-sm ${enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
    >
      {enabled ? 'ON' : 'OFF'}
    </button>
  );
}

function ToggleCard({ title, description, enabled, onToggle }: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-gray-400">{description}</div>
        </div>
        <ToggleButton enabled={enabled} onToggle={onToggle} />
      </div>
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
