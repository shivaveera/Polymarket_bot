'use client';

import { useState } from 'react';

export function BotControls({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const [triggering, setTriggering] = useState(false);

  async function handleManualTrigger() {
    setTriggering(true);
    try {
      await fetch('/api/manual/trigger', { method: 'POST' });
    } catch (e) {
      console.error('Manual trigger failed:', e);
    }
    setTriggering(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onToggle(!enabled)}
        className={`px-4 py-2 rounded-lg font-semibold text-sm ${
          enabled
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
      >
        {enabled ? 'Running' : 'Stopped'}
      </button>
      <button
        onClick={handleManualTrigger}
        disabled={triggering}
        className="px-4 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-sm disabled:opacity-50"
      >
        {triggering ? 'Triggering...' : 'Manual Tick'}
      </button>
    </div>
  );
}
