'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { mastersApi } from '@/modules/manufacturing/planning/api';
import { partsApi, type PartSummary } from '@/modules/engineering/parts/api';
import { ApiError } from '@/shared/lib/api/client';

export function CreateMasterButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-4 inline-flex items-center text-xs uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 rounded-sm hover:bg-accent/25 transition-colors"
      >
        + Create Engineering Master
      </button>
      {open && <CreateMasterModal onClose={() => setOpen(false)} />}
    </>
  );
}

function CreateMasterModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [partNumber, setPartNumber] = useState('');
  const [selected, setSelected] = useState<PartSummary | null>(null);
  const [matches, setMatches] = useState<PartSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Dynamic part search as the user types.
  useEffect(() => {
    const q = partNumber.trim();
    if (q.length < 1) {
      setMatches([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      try {
        const results = await partsApi.list({ search: q });
        if (active) setMatches(results);
      } catch {
        /* ignore lookup errors */
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [partNumber]);

  function pick(part: PartSummary) {
    setSelected(part);
    setPartNumber(part.partNumber);
    setMatches([]);
  }

  function onType(value: string) {
    setPartNumber(value.toUpperCase());
    setSelected(null); // editing invalidates a prior selection
  }

  function create() {
    const pn = partNumber.trim();
    if (pn === '') return;
    setError(null);
    start(async () => {
      try {
        const master = await mastersApi.create({
          partNumber: pn,
          partId: selected?.id ?? null,
          partName: selected?.name ?? null,
        });
        router.push(`/manufacturing/planning/${master.id}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to create engineering master.');
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg surface rounded-sm border hairline shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b hairline">
          <h2 className="text-sm font-semibold text-ink-100">New Engineering Master</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1.5">
              Part number
            </label>
            <input
              autoFocus
              value={partNumber}
              onChange={(e) => onType(e.target.value)}
              placeholder="Search or type a part number…"
              className="w-full h-10 bg-ink-950 border hairline rounded-sm px-3 font-mono text-ink-100 focus:outline-none focus:border-accent"
            />
            <p className="mt-1.5 text-xs text-ink-400">
              Pick an existing part to link its details, or type any number — even one that
              doesn&apos;t exist yet.
            </p>
          </div>

          {/* Live search results */}
          {matches.length > 0 && (
            <ul className="max-h-56 overflow-auto border hairline rounded-sm divide-y divide-ink-700/60">
              {matches.map((p) => (
                <li
                  key={p.id}
                  onClick={() => pick(p)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-ink-800/50"
                >
                  <span className="font-mono text-sm text-accent">{p.partNumber}</span>
                  <span className="text-sm text-ink-300 truncate">{p.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-widest text-ink-500">
                    rev {p.revision}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Selection summary */}
          <div className="text-xs">
            {selected ? (
              <span className="text-signal-ok">
                ✓ Linked to {selected.partNumber} — {selected.name}
              </span>
            ) : partNumber.trim() !== '' ? (
              <span className="text-ink-400">
                Will create an unlinked master for <span className="font-mono text-ink-200">{partNumber.trim()}</span>
              </span>
            ) : null}
          </div>

          {error && <div className="text-xs text-signal-alert font-mono">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t hairline">
          <button
            onClick={onClose}
            className="h-9 px-4 text-xs uppercase tracking-wider border hairline rounded-sm text-ink-300 hover:text-ink-100"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={pending || partNumber.trim() === ''}
            className="h-9 px-4 text-xs uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 rounded-sm hover:bg-accent/25 disabled:opacity-40"
          >
            {pending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
