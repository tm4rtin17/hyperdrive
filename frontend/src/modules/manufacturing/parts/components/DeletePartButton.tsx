'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { partsApi } from '@/modules/manufacturing/parts/api';
import { ApiError } from '@/shared/lib/api/client';

export function DeletePartButton({ id, partNumber }: { id: string; partNumber: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!window.confirm(`Delete ${partNumber}? It will be archived and hidden from the catalog (recoverable).`))
      return;
    setError(null);
    start(async () => {
      try {
        await partsApi.remove(id);
        router.push('/manufacturing/parts');
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unexpected error deleting part.');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-signal-alert font-mono">{error}</span>}
      <button
        onClick={onDelete}
        disabled={pending}
        className="h-8 px-3 text-xs uppercase tracking-wider border border-signal-alert/40 text-signal-alert rounded-sm hover:bg-signal-alert/10 disabled:opacity-50"
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  );
}
