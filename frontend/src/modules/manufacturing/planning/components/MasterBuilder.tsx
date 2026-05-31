'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { mastersApi, type EngineeringMaster, type Operation, type Step } from '@/modules/manufacturing/planning/api';
import { ApiError } from '@/shared/lib/api/client';

export function MasterBuilder({ master }: { master: EngineeringMaster }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const sortedOps = [...master.operations].sort((a, b) => a.sequence - b.sequence);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(sortedOps[0]?.id ?? null);
  const [newOpName, setNewOpName] = useState('');

  const selectedOp: Operation | null =
    master.operations.find((o) => o.id === selectedOpId) ?? sortedOps[0] ?? null;

  function run(fn: () => Promise<unknown>, after?: (result: unknown) => void) {
    setGlobalError(null);
    start(async () => {
      try {
        const result = await fn();
        after?.(result);
        router.refresh();
      } catch (err) {
        setGlobalError(err instanceof ApiError ? err.message : 'Unexpected error.');
      }
    });
  }

  function addOperation() {
    const name = newOpName.trim();
    if (name === '') return;
    run(
      () => mastersApi.addOperation(master.id, name),
      (result) => {
        setNewOpName('');
        if (result && typeof result === 'object' && 'id' in result)
          setSelectedOpId((result as Operation).id);
      },
    );
  }

  return (
    // Full-height split layout, accounting for the h-14 top nav.
    <div className="flex" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Operations sidebar ── */}
      <aside className="w-64 flex flex-col border-r hairline bg-ink-900/60 shrink-0">

        {/* Part identity + back link */}
        <div className="px-4 pt-5 pb-4 border-b hairline">
          <Link
            href="/manufacturing/planning"
            className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-accent transition-colors"
          >
            ← Planning
          </Link>
          <div className="mt-2 font-mono text-base text-ink-100 leading-tight">{master.partNumber}</div>
          <div className="text-xs text-ink-400 truncate">
            {master.partName ?? <span className="italic text-ink-500">unlinked part</span>}
          </div>
          <div className="mt-2 inline-flex items-center px-2 h-5 text-[10px] uppercase tracking-widest border rounded-sm bg-accent/10 text-accent border-accent/30">
            {master.status}
          </div>
        </div>

        {/* Op tiles (scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sortedOps.length === 0 ? (
            <p className="text-center text-xs text-ink-500 py-6">No operations yet.</p>
          ) : (
            sortedOps.map((op) => (
              <OpTile
                key={op.id}
                op={op}
                selected={op.id === selectedOp?.id}
                onClick={() => setSelectedOpId(op.id)}
              />
            ))
          )}
        </div>

        {/* Add operation input */}
        <div className="border-t hairline p-3 space-y-2">
          <input
            value={newOpName}
            onChange={(e) => setNewOpName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOperation()}
            placeholder="Operation name…"
            className="w-full h-8 bg-ink-950 border hairline rounded-sm px-2 text-sm text-ink-100 focus:outline-none focus:border-accent"
          />
          <button
            onClick={addOperation}
            disabled={pending || newOpName.trim() === ''}
            className="w-full h-8 text-xs uppercase tracking-wider border border-accent/30 text-accent rounded-sm hover:bg-accent/15 disabled:opacity-40"
          >
            + Add Operation
          </button>
        </div>
      </aside>

      {/* ── Steps editor ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {globalError && (
          <div className="px-5 py-2 text-xs text-signal-alert font-mono bg-ink-900 border-b hairline">
            {globalError}
          </div>
        )}
        {selectedOp === null ? (
          <div className="flex-1 flex items-center justify-center text-sm text-ink-400">
            Add an operation to begin.
          </div>
        ) : (
          <StepsPanel
            key={selectedOp.id}
            masterId={master.id}
            operation={selectedOp}
            pending={pending}
            run={run}
            onRemoved={() => setSelectedOpId(sortedOps.find(o => o.id !== selectedOp.id)?.id ?? null)}
          />
        )}
      </main>
    </div>
  );
}

// ── Op tile ──────────────────────────────────────────────────────────────────

function OpTile({
  op,
  selected,
  onClick,
}: {
  op: Operation;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-sm border px-3 py-3 transition-colors ${
        selected
          ? 'bg-accent/10 border-accent/40'
          : 'surface border-ink-700 hover:border-ink-500 hover:bg-ink-800/50'
      }`}
    >
      <div className={`font-mono text-lg font-semibold leading-tight ${selected ? 'text-accent' : 'text-ink-100'}`}>
        Op {op.sequence}
      </div>
      <div className={`text-xs truncate mt-0.5 ${selected ? 'text-accent/80' : 'text-ink-300'}`}>
        {op.name}
      </div>
      <div className="text-[10px] text-ink-500 mt-1">
        {op.steps.length} step{op.steps.length !== 1 ? 's' : ''}
      </div>
    </button>
  );
}

// ── Steps panel ──────────────────────────────────────────────────────────────

function StepsPanel({
  masterId,
  operation,
  pending,
  run,
  onRemoved,
}: {
  masterId: string;
  operation: Operation;
  pending: boolean;
  run: (fn: () => Promise<unknown>, after?: (result: unknown) => void) => void;
  onRemoved: () => void;
}) {
  const [name, setName] = useState(operation.name);
  const [newStep, setNewStep] = useState('');
  const nameDirty = name.trim() !== '' && name.trim() !== operation.name;
  const sortedSteps = [...operation.steps].sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Op header bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b hairline bg-ink-900/50 shrink-0">
        <span className="font-mono text-sm text-ink-400 shrink-0">Op {operation.sequence}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 h-9 bg-ink-950 border hairline rounded-sm px-3 text-base text-ink-100 focus:outline-none focus:border-accent"
        />
        {nameDirty && (
          <button
            onClick={() =>
              run(() =>
                mastersApi.updateOperation(masterId, operation.id, {
                  sequence: operation.sequence,
                  name: name.trim(),
                }),
              )
            }
            disabled={pending}
            className="h-9 px-3 text-xs uppercase tracking-wider text-accent border border-accent/30 rounded-sm hover:bg-accent/15 disabled:opacity-50 shrink-0"
          >
            Save
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm(`Remove operation "${operation.name}" and all its steps?`))
              run(() => mastersApi.removeOperation(masterId, operation.id), onRemoved);
          }}
          disabled={pending}
          className="h-9 px-3 text-xs uppercase tracking-wider text-signal-alert border border-signal-alert/30 rounded-sm hover:bg-signal-alert/10 disabled:opacity-50 shrink-0"
        >
          Remove
        </button>
      </div>

      {/* Steps list (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        {sortedSteps.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-ink-500">
            No steps yet — add one below.
          </div>
        ) : (
          <ol className="divide-y divide-ink-700/60">
            {sortedSteps.map((step) => (
              <StepRow
                key={step.id}
                masterId={masterId}
                opId={operation.id}
                step={step}
                pending={pending}
                run={run}
              />
            ))}
          </ol>
        )}
      </div>

      {/* Add step footer */}
      <div className="flex gap-2 px-5 py-4 border-t hairline shrink-0">
        <input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newStep.trim() !== '')
              run(() => mastersApi.addStep(masterId, operation.id, newStep.trim()), () => setNewStep(''));
          }}
          placeholder="Describe this step…"
          className="flex-1 h-10 bg-ink-950 border hairline rounded-sm px-3 text-sm text-ink-100 focus:outline-none focus:border-accent"
        />
        <button
          onClick={() =>
            run(() => mastersApi.addStep(masterId, operation.id, newStep.trim()), () => setNewStep(''))
          }
          disabled={pending || newStep.trim() === ''}
          className="h-10 px-4 text-xs uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 rounded-sm hover:bg-accent/25 disabled:opacity-40 shrink-0"
        >
          Add Step
        </button>
      </div>
    </>
  );
}

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({
  masterId,
  opId,
  step,
  pending,
  run,
}: {
  masterId: string;
  opId: string;
  step: Step;
  pending: boolean;
  run: (fn: () => Promise<unknown>, after?: (result: unknown) => void) => void;
}) {
  const [text, setText] = useState(step.text);
  const dirty = text.trim() !== '' && text.trim() !== step.text;

  return (
    <li className="flex items-start gap-4 px-5 py-3">
      <span className="mt-2.5 font-mono text-xs text-ink-500 tabular-nums w-5 shrink-0">{step.order}</span>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="flex-1 bg-ink-950 border hairline rounded-sm px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-accent resize-y"
      />
      <div className="flex flex-col gap-1 pt-1 shrink-0">
        {dirty && (
          <button
            onClick={() => run(() => mastersApi.updateStep(masterId, opId, step.id, text.trim()))}
            disabled={pending}
            className="h-7 px-2 text-xs text-accent hover:underline disabled:opacity-50"
          >
            Save
          </button>
        )}
        <button
          onClick={() => run(() => mastersApi.removeStep(masterId, opId, step.id))}
          disabled={pending}
          className="h-7 px-2 text-xs text-signal-alert hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
