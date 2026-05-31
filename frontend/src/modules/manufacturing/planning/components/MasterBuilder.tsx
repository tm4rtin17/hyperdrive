'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { mastersApi, type EngineeringMaster, type Operation, type Step } from '@/modules/manufacturing/planning/api';
import { ApiError } from '@/shared/lib/api/client';

export function MasterBuilder({ master }: { master: EngineeringMaster }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(master.operations[0]?.id ?? null);
  const [newOpName, setNewOpName] = useState('');

  const selectedOp: Operation | null =
    master.operations.find((o) => o.id === selectedOpId) ?? master.operations[0] ?? null;

  function run(fn: () => Promise<unknown>, after?: (result: unknown) => void) {
    setError(null);
    start(async () => {
      try {
        const result = await fn();
        after?.(result);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unexpected error.');
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
        if (result && typeof result === 'object' && 'id' in result) {
          setSelectedOpId((result as Operation).id);
        }
      },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Operations sidebar */}
      <aside className="surface rounded-sm overflow-hidden self-start">
        <div className="px-4 py-2.5 bg-ink-800/60 text-[10px] uppercase tracking-widest text-ink-400">
          Operations
        </div>

        {master.operations.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-ink-400">No operations yet.</div>
        ) : (
          <ul className="divide-y divide-ink-700/60">
            {master.operations.map((op) => (
              <li
                key={op.id}
                onClick={() => setSelectedOpId(op.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  op.id === selectedOp?.id ? 'bg-ink-800/60' : 'hover:bg-ink-800/30'
                }`}
              >
                <span className="font-mono text-xs text-ink-400 w-6 tabular-nums">{op.sequence}</span>
                <span className="text-sm text-ink-100 truncate">{op.name}</span>
                <span className="ml-auto text-[10px] text-ink-500 tabular-nums">{op.steps.length}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Add operation */}
        <div className="flex gap-2 px-3 py-3 border-t border-ink-700/60">
          <input
            value={newOpName}
            onChange={(e) => setNewOpName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOperation()}
            placeholder="New operation…"
            className="flex-1 h-8 bg-ink-950 border hairline rounded-sm px-2 text-sm text-ink-100 focus:outline-none focus:border-accent"
          />
          <button
            onClick={addOperation}
            disabled={pending || newOpName.trim() === ''}
            className="h-8 px-3 text-xs uppercase tracking-wider text-accent border border-accent/30 rounded-sm hover:bg-accent/15 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </aside>

      {/* Steps panel */}
      <section className="surface rounded-sm overflow-hidden">
        {selectedOp === null ? (
          <div className="px-6 py-20 text-center text-sm text-ink-400">
            Add an operation to begin building this master.
          </div>
        ) : (
          <StepsPanel
            key={selectedOp.id}
            masterId={master.id}
            operation={selectedOp}
            pending={pending}
            run={run}
            onRemoved={() => setSelectedOpId(null)}
          />
        )}
        {error && <div className="px-5 py-2 text-xs text-signal-alert font-mono border-t border-ink-700/60">{error}</div>}
      </section>
    </div>
  );
}

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

  const nameDirty = name.trim() !== operation.name && name.trim() !== '';

  return (
    <>
      {/* Operation header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-ink-800/40 border-b border-ink-700/60">
        <span className="font-mono text-sm text-ink-400 tabular-nums">Op {operation.sequence}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 h-8 bg-transparent border-b border-transparent hover:border-ink-700 focus:border-accent px-1 text-base text-ink-100 focus:outline-none"
        />
        {nameDirty && (
          <button
            onClick={() => run(() => mastersApi.updateOperation(masterId, operation.id, { sequence: operation.sequence, name: name.trim() }))}
            disabled={pending}
            className="h-7 px-2 text-xs uppercase tracking-wider text-accent hover:underline disabled:opacity-50"
          >
            Save name
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm(`Remove operation "${operation.name}" and its steps?`))
              run(() => mastersApi.removeOperation(masterId, operation.id), onRemoved);
          }}
          disabled={pending}
          className="h-7 px-2 text-xs uppercase tracking-wider text-signal-alert hover:underline disabled:opacity-50"
        >
          Remove op
        </button>
      </div>

      {/* Steps */}
      <ol className="divide-y divide-ink-700/60">
        {operation.steps.map((step) => (
          <StepRow key={step.id} masterId={masterId} opId={operation.id} step={step} pending={pending} run={run} />
        ))}
      </ol>

      {operation.steps.length === 0 && (
        <div className="px-5 py-8 text-center text-xs text-ink-400">No steps yet.</div>
      )}

      {/* Add step */}
      <div className="flex gap-2 px-5 py-4 border-t border-ink-700/60">
        <input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newStep.trim() !== '') {
              run(() => mastersApi.addStep(masterId, operation.id, newStep.trim()), () => setNewStep(''));
            }
          }}
          placeholder="Add a step…"
          className="flex-1 h-10 bg-ink-950 border hairline rounded-sm px-3 text-sm text-ink-100 focus:outline-none focus:border-accent"
        />
        <button
          onClick={() => run(() => mastersApi.addStep(masterId, operation.id, newStep.trim()), () => setNewStep(''))}
          disabled={pending || newStep.trim() === ''}
          className="h-10 px-4 text-xs uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 rounded-sm hover:bg-accent/25 disabled:opacity-40"
        >
          Add Step
        </button>
      </div>
    </>
  );
}

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
  const dirty = text.trim() !== step.text && text.trim() !== '';

  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <span className="mt-2 font-mono text-xs text-ink-500 tabular-nums w-6">{step.order}</span>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        className="flex-1 min-h-[2.5rem] bg-ink-950 border hairline rounded-sm px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-accent resize-y"
      />
      <div className="flex flex-col items-end gap-1 pt-1 whitespace-nowrap">
        {dirty && (
          <button
            onClick={() => run(() => mastersApi.updateStep(masterId, opId, step.id, text.trim()))}
            disabled={pending}
            className="text-xs text-accent hover:underline disabled:opacity-50"
          >
            Save
          </button>
        )}
        <button
          onClick={() => run(() => mastersApi.removeStep(masterId, opId, step.id))}
          disabled={pending}
          className="text-xs text-signal-alert hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
