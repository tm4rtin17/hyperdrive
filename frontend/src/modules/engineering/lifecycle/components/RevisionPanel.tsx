'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { lifecycleApi, type PartRevision } from '@/modules/engineering/lifecycle/api';
import { ApiError } from '@/shared/lib/api/client';

export function RevisionPanel({
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

  const current = revisions.reduce((a, b) => (b.ordinal > a.ordinal ? b : a));
  const selected = revisions.find((r) => r.id === selectedRevId) ?? current;

  function run(fn: () => Promise<unknown>, navigateTo?: (revId: string) => void) {
    setError(null);
    start(async () => {
      try {
        const result = await fn();
        if (navigateTo && result && typeof result === 'object' && 'id' in result) {
          navigateTo((result as PartRevision).id);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unexpected error.');
      }
    });
  }

  function select(revId: string) {
    router.push(`${pathname}?rev=${revId}`);
  }

  return (
    <section className="surface rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-ink-800/60">
        <span className="text-[10px] uppercase tracking-widest text-ink-400">Revisions</span>
        {current.lifecycle === 'Released' && (
          <button
            onClick={() =>
              run(() => lifecycleApi.createNextRevision(partId), (id) => select(id))
            }
            disabled={pending}
            className="text-[10px] uppercase tracking-wider text-accent hover:underline disabled:opacity-50"
          >
            + New Revision
          </button>
        )}
      </div>

      <ul className="divide-y divide-ink-700/60">
        {[...revisions]
          .sort((a, b) => b.ordinal - a.ordinal)
          .map((r) => (
            <li
              key={r.id}
              onClick={() => select(r.id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                r.id === selected.id ? 'bg-ink-800/50' : 'hover:bg-ink-800/30'
              }`}
            >
              <span className="font-mono text-lg text-ink-100 w-10">{r.rev}</span>
              <RevBadge value={r.lifecycle} />
              <span className="text-xs text-ink-400">{r.lineCount} lines</span>
              <span className="ml-auto text-[10px] font-mono text-ink-500">
                {r.releasedAt
                  ? `rel ${new Date(r.releasedAt).toLocaleDateString()}`
                  : new Date(r.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
      </ul>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-ink-700/60">
        {selected.lifecycle === 'InWork' && (
          <button
            onClick={() => run(() => lifecycleApi.releaseRevision(partId, selected.id))}
            disabled={pending}
            className="h-8 px-3 text-xs uppercase tracking-wider bg-signal-ok/15 text-signal-ok border border-signal-ok/30 rounded-sm hover:bg-signal-ok/25 disabled:opacity-50"
          >
            Release {selected.rev}
          </button>
        )}
        {selected.lifecycle !== 'Obsolete' && (
          <button
            onClick={() => run(() => lifecycleApi.obsoleteRevision(partId, selected.id))}
            disabled={pending}
            className="h-8 px-3 text-xs uppercase tracking-wider border border-ink-600 text-ink-400 rounded-sm hover:bg-ink-700/40 disabled:opacity-50"
          >
            Obsolete {selected.rev}
          </button>
        )}
        {selected.lifecycle === 'Obsolete' && (
          <button
            onClick={() => run(() => lifecycleApi.restoreRevision(partId, selected.id))}
            disabled={pending}
            className="h-8 px-3 text-xs uppercase tracking-wider border border-signal-ok/40 text-signal-ok rounded-sm hover:bg-signal-ok/10 disabled:opacity-50"
          >
            Restore {selected.rev}
          </button>
        )}
        {error && <span className="text-xs text-signal-alert font-mono">{error}</span>}
      </div>
    </section>
  );
}

function RevBadge({ value }: { value: string }) {
  const tone =
    value === 'Released'
      ? 'bg-signal-ok/15 text-signal-ok border-signal-ok/30'
      : value === 'Obsolete'
        ? 'bg-ink-700 text-ink-400 border-ink-600'
        : 'bg-accent/10 text-accent border-accent/30';
  return (
    <span
      className={`inline-flex items-center px-2 h-5 text-[10px] uppercase tracking-widest border rounded-sm ${tone}`}
    >
      {value}
    </span>
  );
}
