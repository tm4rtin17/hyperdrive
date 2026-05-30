'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { partsApi } from '@/modules/manufacturing/parts/api';
import { ApiError } from '@/shared/lib/api/client';

export function RestorePartButton({ id, partNumber }: { id: string; partNumber: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRestore() {
    if (!window.confirm(`Restore ${partNumber}? It will reappear in the active catalog.`)) return;
    setError(null);
    start(async () => {
      try {
        await partsApi.restore(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unexpected error restoring part.');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-signal-alert font-mono">{error}</span>}
      <button
        onClick={onRestore}
        disabled={pending}
        className="h-8 px-3 text-xs uppercase tracking-wider border border-signal-ok/40 text-signal-ok rounded-sm hover:bg-signal-ok/10 disabled:opacity-50"
      >
        {pending ? 'Restoring…' : 'Restore'}
      </button>
    </div>
  );
}
