'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { lifecycleApi, type BomLine, type PartRevision } from '@/modules/engineering/lifecycle/api';
import { partsApi, type PartSummary } from '@/modules/engineering/parts/api';
import { ApiError } from '@/shared/lib/api/client';

export function BomEditor({
  partId,
  revision,
  lines,
}: {
  partId: string;
  revision: PartRevision;
  lines: BomLine[];
}) {
  const editable = revision.lifecycle === 'InWork';

  return (
    <section className="surface rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-ink-800/60">
        <span className="text-[10px] uppercase tracking-widest text-ink-400">
          Bill of Materials — Rev {revision.rev}
        </span>
        {!editable && (
          <span className="text-[10px] uppercase tracking-widest text-ink-500">
            {revision.lifecycle} · read-only
          </span>
        )}
      </div>

      {lines.length === 0 && !editable ? (
        <div className="px-6 py-12 text-center text-sm text-ink-400">No BOM lines.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-ink-400 bg-ink-800/30">
            <tr>
              <Th className="w-16">Find</Th>
              <Th>Child Part</Th>
              <Th>Name</Th>
              <Th className="w-24">Qty</Th>
              <Th className="w-32">Ref Des</Th>
              {editable && <Th className="w-24 text-right">—</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/60">
            {lines.map((line) => (
              <BomRow key={line.id} partId={partId} revId={revision.id} line={line} editable={editable} />
            ))}
            {editable && <AddRow partId={partId} revId={revision.id} parentId={partId} />}
          </tbody>
        </table>
      )}
    </section>
  );
}

function BomRow({
  partId,
  revId,
  line,
  editable,
}: {
  partId: string;
  revId: string;
  line: BomLine;
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(String(line.quantity));
  const [find, setFind] = useState(line.findNumber != null ? String(line.findNumber) : '');
  const [refDes, setRefDes] = useState(line.referenceDesignator ?? '');
  const [error, setError] = useState<string | null>(null);

  const dirty =
    qty !== String(line.quantity) ||
    find !== (line.findNumber != null ? String(line.findNumber) : '') ||
    refDes !== (line.referenceDesignator ?? '');

  function save() {
    setError(null);
    start(async () => {
      try {
        await lifecycleApi.updateBomLine(partId, revId, line.id, {
          quantity: Number(qty),
          findNumber: find.trim() === '' ? null : Number(find),
          referenceDesignator: refDes.trim() || null,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Error.');
      }
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      try {
        await lifecycleApi.removeBomLine(partId, revId, line.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Error.');
      }
    });
  }

  if (!editable) {
    return (
      <tr>
        <Td className="font-mono text-ink-400">{line.findNumber ?? '—'}</Td>
        <Td className="font-mono text-ink-100">{line.childPartNumber}</Td>
        <Td className="text-ink-300">{line.childName}</Td>
        <Td className="font-mono">{line.quantity}</Td>
        <Td className="text-ink-400">{line.referenceDesignator ?? '—'}</Td>
      </tr>
    );
  }

  return (
    <tr>
      <Td>
        <input value={find} onChange={(e) => setFind(e.target.value)} type="number" className={cellInput} />
      </Td>
      <Td className="font-mono text-ink-100">{line.childPartNumber}</Td>
      <Td className="text-ink-300">{line.childName}</Td>
      <Td>
        <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" step="any" className={cellInput} />
      </Td>
      <Td>
        <input value={refDes} onChange={(e) => setRefDes(e.target.value)} className={cellInput} />
      </Td>
      <Td className="text-right whitespace-nowrap">
        {dirty && (
          <button onClick={save} disabled={pending} className="text-xs text-accent hover:underline mr-3 disabled:opacity-50">
            Save
          </button>
        )}
        <button onClick={remove} disabled={pending} className="text-xs text-signal-alert hover:underline disabled:opacity-50">
          Remove
        </button>
        {error && <div className="text-[10px] text-signal-alert font-mono">{error}</div>}
      </Td>
    </tr>
  );
}

function AddRow({ partId, revId, parentId }: { partId: string; revId: string; parentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [child, setChild] = useState('');
  const [qty, setQty] = useState('1');
  const [find, setFind] = useState('');
  const [refDes, setRefDes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<PartSummary[]>([]);

  // Lightweight child-part lookup for the datalist.
  useEffect(() => {
    const q = child.trim();
    if (q.length < 1) {
      setMatches([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      try {
        const results = await partsApi.list({ search: q });
        if (active) setMatches(results.filter((p) => p.id !== parentId));
      } catch {
        /* ignore lookup errors */
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [child, parentId]);

  function add() {
    setError(null);
    start(async () => {
      try {
        await lifecycleApi.addBomLine(partId, revId, {
          childPartNumber: child.trim(),
          quantity: Number(qty),
          findNumber: find.trim() === '' ? null : Number(find),
          referenceDesignator: refDes.trim() || null,
        });
        setChild('');
        setQty('1');
        setFind('');
        setRefDes('');
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Error adding line.');
      }
    });
  }

  return (
    <tr className="bg-ink-900/40">
      <Td>
        <input value={find} onChange={(e) => setFind(e.target.value)} type="number" placeholder="#" className={cellInput} />
      </Td>
      <Td colSpan={2}>
        <input
          value={child}
          onChange={(e) => setChild(e.target.value.toUpperCase())}
          placeholder="Child part number…"
          list="bom-child-parts"
          className={`${cellInput} font-mono`}
        />
        <datalist id="bom-child-parts">
          {matches.map((m) => (
            <option key={m.id} value={m.partNumber}>
              {m.name}
            </option>
          ))}
        </datalist>
      </Td>
      <Td>
        <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" step="any" className={cellInput} />
      </Td>
      <Td>
        <input value={refDes} onChange={(e) => setRefDes(e.target.value)} placeholder="ref des" className={cellInput} />
      </Td>
      <Td className="text-right">
        <button
          onClick={add}
          disabled={pending || child.trim() === ''}
          className="text-xs uppercase tracking-wider text-accent hover:underline disabled:opacity-40"
        >
          {pending ? '…' : 'Add'}
        </button>
        {error && <div className="text-[10px] text-signal-alert font-mono">{error}</div>}
      </Td>
    </tr>
  );
}

const cellInput =
  'w-full h-8 bg-ink-950 border hairline rounded-sm px-2 text-ink-100 focus:outline-none focus:border-accent';

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-medium px-4 py-2 ${className}`}>{children}</th>;
}
function Td({
  children,
  className = '',
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`px-4 py-2 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
