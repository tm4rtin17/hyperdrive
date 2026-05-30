'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { lifecycleApi, type PartRevision } from '@/modules/engineering/lifecycle/api';
import { ApiError } from '@/shared/lib/api/client';

const LIFECYCLE_LABELS: Record<string, string> = {
  InWork: 'In Work',
  Released: 'Released',
  Obsolete: 'Obsolete',
};

export function RevisionBar({
  partId,
  revisions,
  selectedRevId,
}: {
  partId: string;
  revisions: PartRevision[];
  selectedRevId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sorted = [...revisions].sort((a, b) => b.ordinal - a.ordinal);
  const selected = revisions.find((r) => r.id === selectedRevId) ?? sorted[0]!;
  const current = sorted[0]!;

  function select(revId: string) {
    router.push(`${pathname}?rev=${revId}`);
  }

  function run(fn: () => Promise<unknown>, onSuccess?: (result: unknown) => void) {
    setError(null);
    start(async () => {
      try {
        const result = await fn();
        onSuccess?.(result);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unexpected error.');
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Revision selector */}
      <select
        value={selected.id}
        onChange={(e) => select(e.target.value)}
        disabled={pending}
        className="h-9 pl-3 pr-8 bg-ink-800 border hairline rounded-sm text-sm text-ink-100 focus:outline-none focus:border-accent appearance-none cursor-pointer disabled:opacity-50"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        {sorted.map((r) => (
          <option key={r.id} value={r.id}>
            Rev {r.rev} — {LIFECYCLE_LABELS[r.lifecycle] ?? r.lifecycle}
          </option>
        ))}
      </select>

      {/* Actions for the selected revision */}
      {selected.lifecycle === 'InWork' && (
        <button
          onClick={() => run(() => lifecycleApi.releaseRevision(partId, selected.id))}
          disabled={pending}
          className="h-9 px-3 text-xs uppercase tracking-wider bg-signal-ok/15 text-signal-ok border border-signal-ok/30 rounded-sm hover:bg-signal-ok/25 disabled:opacity-50"
        >
          Release {selected.rev}
        </button>
      )}
      {selected.lifecycle === 'Obsolete' && (
        <button
          onClick={() => run(() => lifecycleApi.restoreRevision(partId, selected.id))}
          disabled={pending}
          className="h-9 px-3 text-xs uppercase tracking-wider border border-signal-ok/40 text-signal-ok rounded-sm hover:bg-signal-ok/10 disabled:opacity-50"
        >
          Restore {selected.rev}
        </button>
      )}
      {selected.lifecycle !== 'Obsolete' && (
        <button
          onClick={() => run(() => lifecycleApi.obsoleteRevision(partId, selected.id))}
          disabled={pending}
          className="h-9 px-3 text-xs uppercase tracking-wider border border-ink-600 text-ink-400 rounded-sm hover:bg-ink-700/40 disabled:opacity-50"
        >
          Obsolete {selected.rev}
        </button>
      )}
      {current.lifecycle === 'Released' && (
        <button
          onClick={() =>
            run(() => lifecycleApi.createNextRevision(partId), (result) => {
              if (result && typeof result === 'object' && 'id' in result)
                select((result as PartRevision).id);
            })
          }
          disabled={pending}
          className="h-9 px-3 text-xs uppercase tracking-wider border hairline text-ink-200 rounded-sm hover:border-accent hover:text-accent disabled:opacity-50"
        >
          + New Revision
        </button>
      )}

      {error && <span className="text-xs text-signal-alert font-mono">{error}</span>}
    </div>
  );
}
