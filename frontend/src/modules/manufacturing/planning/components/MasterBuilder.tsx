'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  mastersApi,
  type EngineeringMaster,
  type Operation,
  type OperationAttachment,
  type Step,
  type StepAttachment,
  type WorkRole,
  type WorkRoleOption,
} from '@/modules/manufacturing/planning/api';
import { ApiError } from '@/shared/lib/api/client';
import { SequenceEditor } from '@/modules/manufacturing/planning/components/SequenceEditor';
import { HeaderEditor, type HeaderEditorHandle } from '@/modules/manufacturing/planning/components/HeaderEditor';
import { textToHtml, htmlToText } from '@/modules/manufacturing/planning/components/RichTextEditor';

type BuilderMode = 'header' | 'operations';

export function MasterBuilder({ master }: { master: EngineeringMaster }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [mode, setMode] = useState<BuilderMode>('header');
  const [showSequence, setShowSequence] = useState(false);
  const headerRef = useRef<HeaderEditorHandle>(null);
  const [headerDirty, setHeaderDirty] = useState(false);
  const [headerCanSave, setHeaderCanSave] = useState(false);
  // Per-operation dirty/save registry — survives operation switches.
  const opsRegistryRef = useRef(new Map<string, { dirty: boolean; save: () => void }>());
  const [opsDirty, setOpsDirty] = useState(false);
  // Saves every dirty operation in one call.
  const opsSaveRef = useRef<() => void>(() => {});
  const anyDirty = headerDirty || opsDirty;
  // Ops dirty as a ref so event handlers (registered once) always see the current value.
  const opsDirtyRef = useRef(false);
  opsDirtyRef.current = opsDirty;

  // Persist unsaved edits across component remounts (e.g. router.refresh() RSC reconciliation).
  const stepEditsRef = useRef(new Map<string, { title: string; body: string | null; order: string; role: WorkRole | null; secondaryRole: WorkRole | null }>());
  const opEditsRef = useRef(new Map<string, { name: string; seq: string; instructions: string; role: WorkRole | null; secondaryRole: WorkRole | null }>());

  // Selectable buyoff roles — fetched once from the reference-data endpoint.
  const [workRoles, setWorkRoles] = useState<WorkRoleOption[]>([]);
  useEffect(() => {
    mastersApi.listWorkRoles().then(setWorkRoles).catch(() => { /* non-fatal: selector falls back to empty */ });
  }, []);

  // Guard state: null = no dialog, otherwise stores the action to run after confirmation.
  const [guardIntent, setGuardIntent] = useState<{ proceed: () => void } | null>(null);
  // When set, navigate here once the in-flight save transition finishes.
  const [pendingNavigate, setPendingNavigate] = useState<{ fn: () => void } | null>(null);

  const sortedOps = [...master.operations].sort((a, b) => a.sequence - b.sequence);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(sortedOps[0]?.id ?? null);
  const [newOpName, setNewOpName] = useState('');

  const selectedOp: Operation | null =
    master.operations.find((o) => o.id === selectedOpId) ?? sortedOps[0] ?? null;

  // ── Navigation guard ────────────────────────────────────────────────────────

  // Synchronous dirty check — reads directly from the live component handles.
  function isAnyDirtyNow() {
    return (headerRef.current?.isDirty() ?? false) || opsDirtyRef.current;
  }

  function handleOpDirtyChange(opId: string, dirty: boolean, save: () => void) {
    opsRegistryRef.current.set(opId, { dirty, save });
    const any = [...opsRegistryRef.current.values()].some((e) => e.dirty);
    setOpsDirty(any);
    opsSaveRef.current = () => {
      opsRegistryRef.current.forEach((e) => { if (e.dirty) e.save(); });
    };
  }

  // Intercept all anchor-link clicks (covers <Link>, TopNav, ModuleMenu) before
  // Next.js's own click handler has a chance to start navigating.
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!isAnyDirtyNow()) return;
      const anchor = (e.target as Element).closest('a[href]');
      if (!anchor) return;
      const resolved = (anchor as HTMLAnchorElement).href; // absolute URL
      try {
        const dest = new URL(resolved);
        if (dest.origin !== window.location.origin) return; // external — let beforeunload handle it
        if (dest.pathname === window.location.pathname) return; // same page (hash jump etc.)
        e.preventDefault();
        e.stopImmediatePropagation();
        const path = dest.pathname + dest.search + dest.hash;
        setGuardIntent({ proceed: () => router.push(path) });
      } catch { /* malformed href — ignore */ }
    }
    document.addEventListener('click', handle, { capture: true });
    return () => document.removeEventListener('click', handle, { capture: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser back button — capture phase fires before Next.js's popstate listener.
  useEffect(() => {
    const savedHref = window.location.href;
    function handle(e: PopStateEvent) {
      if (!isAnyDirtyNow()) return;
      const backDest = window.location.href; // already changed to the back destination
      e.stopImmediatePropagation();
      window.history.pushState(null, '', savedHref); // restore URL
      setGuardIntent({ proceed: () => router.push(backDest) });
    }
    window.addEventListener('popstate', handle, { capture: true });
    return () => window.removeEventListener('popstate', handle, { capture: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab close / hard refresh → native browser "leave page?" dialog.
  useEffect(() => {
    function handle(e: BeforeUnloadEvent) {
      if (isAnyDirtyNow()) { e.preventDefault(); e.returnValue = ''; }
    }
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After "Save" in the guard dialog — wait for the save transition, then navigate.
  useEffect(() => {
    if (!pendingNavigate || pending) return;
    if (globalError) { setPendingNavigate(null); return; } // save failed — stay
    const { fn } = pendingNavigate;
    setPendingNavigate(null);
    fn();
  }, [pending, pendingNavigate, globalError]);

  function guardSave() {
    const { proceed } = guardIntent!;
    setGuardIntent(null);
    headerRef.current?.save();
    opsSaveRef.current();
    setPendingNavigate({ fn: proceed });
  }

  function guardDiscard() {
    const { proceed } = guardIntent!;
    setGuardIntent(null);
    proceed();
  }

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
    if (!name) return;
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
    <>
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Top bar: identity + mode toggle ── */}
      <header className="flex items-center gap-4 px-5 h-12 border-b hairline bg-ink-900/60 shrink-0">
        <button
          onClick={() => {
            if (isAnyDirtyNow()) setGuardIntent({ proceed: () => router.push('/manufacturing/planning') });
            else router.push('/manufacturing/planning');
          }}
          className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-accent transition-colors shrink-0">
          ← Planning
        </button>
        <div className="font-mono text-sm text-ink-100 leading-tight shrink-0">{master.partNumber}</div>
        <div className="text-xs text-ink-400 truncate hidden sm:block">
          {master.partName ?? <span className="italic text-ink-500">unlinked part</span>}
        </div>
        <div className="inline-flex items-center px-2 h-5 text-[10px] uppercase tracking-widest border rounded-sm bg-accent/10 text-accent border-accent/30 shrink-0">
          {master.status}
        </div>

        <div className="flex-1" />

        {/* Mode toggle + save */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { headerRef.current?.save(); opsSaveRef.current(); }}
            disabled={pending || (!headerDirty && !opsDirty) || (headerDirty && !headerCanSave)}
            className="h-8 px-4 text-xs uppercase tracking-wider text-accent border border-accent/30 rounded-sm hover:bg-accent/15 disabled:opacity-40 transition-colors">
            Save
          </button>
          <div className="inline-flex rounded-sm border border-ink-700 overflow-hidden">
            <ModeButton active={mode === 'header'} onClick={() => setMode('header')}>Header</ModeButton>
            <ModeButton active={mode === 'operations'} onClick={() => setMode('operations')}>Operations</ModeButton>
          </div>
        </div>
      </header>

      {globalError && (
        <div className="px-5 py-2 text-xs text-signal-alert font-mono bg-ink-900 border-b hairline shrink-0">
          {globalError}
        </div>
      )}

      {/* Both panels stay mounted so unsaved edits survive mode switches. CSS hides the inactive one. */}
      <div className={`flex-1 flex flex-col overflow-hidden ${mode !== 'header' ? 'hidden' : ''}`}>
        <HeaderEditor
          ref={headerRef}
          master={master}
          pending={pending}
          run={run}
          onDirtyChange={(dirty, canSave) => { setHeaderDirty(dirty); setHeaderCanSave(canSave); }}
        />
      </div>

      <div className={`flex flex-1 overflow-hidden ${mode !== 'operations' ? 'hidden' : ''}`}>
        {/* ── Operations sidebar ── */}
        <aside className="w-64 flex flex-col border-r hairline bg-ink-900/60 shrink-0">
          <div className="px-4 py-3 border-b hairline">
            <button
              onClick={() => setShowSequence(true)}
              className="w-full h-8 flex items-center justify-center gap-2 text-xs uppercase tracking-wider border border-accent/30 text-accent rounded-sm hover:bg-accent/15 transition-colors">
              <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor" aria-hidden="true">
                <rect x="0" y="1.5" width="4" height="3" rx="0.5" />
                <rect x="10" y="4.5" width="4" height="3" rx="0.5" />
                <rect x="0" y="7.5" width="4" height="3" rx="0.5" />
                <path d="M4 3h3.5v3H4zM7.5 6H10M4 9h3.5V6" stroke="currentColor" strokeWidth="1" fill="none" />
              </svg>
              Sequence
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sortedOps.length === 0 ? (
              <p className="text-center text-xs text-ink-500 py-6">No operations yet.</p>
            ) : sortedOps.map((op) => (
              <OpTile key={op.id} op={op} selected={op.id === selectedOp?.id}
                onClick={() => setSelectedOpId(op.id)} />
            ))}
          </div>

          <div className="border-t hairline p-3 space-y-2">
            <input value={newOpName} onChange={(e) => setNewOpName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addOperation()}
              placeholder="Operation name…"
              className="w-full h-8 bg-ink-950 border hairline rounded-sm px-2 text-sm text-ink-100 focus:outline-none focus:border-accent" />
            <button onClick={addOperation} disabled={pending || !newOpName.trim()}
              className="w-full h-8 text-xs uppercase tracking-wider border border-accent/30 text-accent rounded-sm hover:bg-accent/15 disabled:opacity-40">
              + Add Operation
            </button>
          </div>
        </aside>

        {/* ── Steps panels — all mounted, inactive hidden so edits survive op switches ── */}
        <main className="flex-1 overflow-hidden relative">
          {sortedOps.length === 0 && (
            <div className="flex items-center justify-center h-full text-sm text-ink-400">
              Add an operation to begin.
            </div>
          )}
          {sortedOps.map((op) => (
            <div
              key={op.id}
              className={`absolute inset-0 flex flex-col overflow-hidden ${op.id !== selectedOp?.id ? 'hidden' : ''}`}
            >
              <StepsPanel
                masterId={master.id} operation={op}
                pending={pending} run={run}
                workRoles={workRoles}
                stepEditsRef={stepEditsRef}
                opEditsRef={opEditsRef}
                onRemoved={() => setSelectedOpId(sortedOps.find((o) => o.id !== op.id)?.id ?? null)}
                onDirtyChange={(dirty, save) => handleOpDirtyChange(op.id, dirty, save)}
              />
            </div>
          ))}
        </main>
      </div>
    </div>
    {showSequence && <SequenceEditor master={master} onClose={() => setShowSequence(false)} />}

    {guardIntent && (
      <UnsavedChangesDialog
        onSave={guardSave}
        onDiscard={guardDiscard}
        onCancel={() => setGuardIntent(null)}
        saving={pending && !!pendingNavigate}
      />
    )}
    </>
  );
}

// ── Unsaved changes dialog ────────────────────────────────────────────────────

function UnsavedChangesDialog({ onSave, onDiscard, onCancel, saving }: {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative bg-ink-900 border hairline rounded-sm shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-sm font-semibold text-ink-100">Unsaved changes</h2>
        <p className="mt-2 text-sm text-ink-400 leading-relaxed">
          You have unsaved changes that will be lost if you navigate away.
        </p>
        <div className="mt-6 flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="h-8 px-3 text-xs uppercase tracking-wider border hairline text-ink-400 rounded-sm hover:border-ink-400 hover:text-ink-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={onDiscard}
            className="h-8 px-3 text-xs uppercase tracking-wider border border-ink-600 text-ink-300 rounded-sm hover:border-ink-400 hover:text-ink-100 transition-colors">
            Don&apos;t save
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="h-8 px-4 text-xs uppercase tracking-wider bg-accent/15 border border-accent/30 text-accent rounded-sm hover:bg-accent/25 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mode toggle button ─────────────────────────────────────────────────────────

function ModeButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-4 text-xs uppercase tracking-wider transition-colors ${
        active ? 'bg-accent/15 text-accent' : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800/60'
      }`}>
      {children}
    </button>
  );
}

// ── Op tile ──────────────────────────────────────────────────────────────────

function OpTile({ op, selected, onClick }: { op: Operation; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-sm border px-3 py-3 transition-colors ${
        selected ? 'bg-accent/10 border-accent/40' : 'surface border-ink-700 hover:border-ink-500 hover:bg-ink-800/50'
      }`}>
      <div className={`font-mono text-lg font-semibold leading-tight ${selected ? 'text-accent' : 'text-ink-100'}`}>
        Op {op.sequence}
      </div>
      <div className={`text-xs truncate mt-0.5 ${selected ? 'text-accent/80' : 'text-ink-300'}`}>{op.name}</div>
      <div className="text-[10px] text-ink-500 mt-1">
        {op.steps.length} step{op.steps.length !== 1 ? 's' : ''}
      </div>
    </button>
  );
}

// ── Primary-buyoff role selector ───────────────────────────────────────────────

function RoleSelect({ value, onChange, roles, disabled }: {
  value: WorkRole | null;
  onChange: (v: WorkRole | null) => void;
  roles: WorkRoleOption[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as WorkRole))}
      disabled={disabled}
      title="Primary buyoff role"
      className={`h-8 bg-ink-950 border hairline rounded-sm px-2 text-xs focus:outline-none focus:border-accent disabled:opacity-50 ${
        value ? 'text-ink-100' : 'text-ink-500'
      }`}>
      <option value="">Unassigned</option>
      {roles.map((r) => (
        <option key={r.value} value={r.value} className="text-ink-100">{r.label}</option>
      ))}
    </select>
  );
}

// ── Steps panel ──────────────────────────────────────────────────────────────

function StepsPanel({ masterId, operation, pending, run, onRemoved, onDirtyChange, stepEditsRef, opEditsRef, workRoles }: {
  masterId: string; operation: Operation; pending: boolean;
  run: (fn: () => Promise<unknown>, after?: (result: unknown) => void) => void;
  onRemoved: () => void;
  onDirtyChange: (dirty: boolean, save: () => void) => void;
  stepEditsRef: React.MutableRefObject<Map<string, { title: string; body: string | null; order: string; role: WorkRole | null; secondaryRole: WorkRole | null }>>;
  opEditsRef: React.MutableRefObject<Map<string, { name: string; seq: string; instructions: string; role: WorkRole | null; secondaryRole: WorkRole | null }>>;
  workRoles: WorkRoleOption[];
}) {
  const cachedOp = opEditsRef.current.get(operation.id);
  const [opName, setOpName] = useState(cachedOp?.name ?? operation.name);
  const [opSeq, setOpSeq] = useState(cachedOp?.seq ?? String(operation.sequence));
  const [opInstructions, setOpInstructions] = useState(cachedOp?.instructions ?? (operation.instructions ?? ''));
  const [opRole, setOpRole] = useState<WorkRole | null>(cachedOp?.role ?? operation.primaryBuyoffRole);
  const [opSecondaryRole, setOpSecondaryRole] = useState<WorkRole | null>(cachedOp?.secondaryRole ?? operation.secondaryBuyoffRole);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [anyStepDirty, setAnyStepDirty] = useState(false);
  const stepRegistry = useRef(new Map<string, { dirty: boolean; save: () => void }>());

  const parsedSeq = parseInt(opSeq, 10);
  const opHeaderDirty = (opName.trim() !== '' && opName.trim() !== operation.name) ||
    (!isNaN(parsedSeq) && parsedSeq !== operation.sequence);
  const instructionsDirty = opInstructions !== (operation.instructions ?? '');
  const roleDirty = opRole !== operation.primaryBuyoffRole || opSecondaryRole !== operation.secondaryBuyoffRole;
  const opDirty = opHeaderDirty || instructionsDirty || roleDirty;
  const overallDirty = opDirty || anyStepDirty;
  const sortedSteps = [...operation.steps].sort((a, b) => a.order - b.order);

  function saveOp() {
    run(() => mastersApi.updateOperation(masterId, operation.id, {
      sequence: isNaN(parsedSeq) ? operation.sequence : parsedSeq,
      name: opName.trim(),
      instructions: opInstructions,
      primaryBuyoffRole: opRole,
      secondaryBuyoffRole: opSecondaryRole,
    }));
  }

  // Always-fresh save-all; stable wrapper passed upward so MasterBuilder ref stays valid.
  const saveAllRef = useRef<() => void>(() => {});
  saveAllRef.current = () => {
    if (opDirty) saveOp();
    stepRegistry.current.forEach(({ dirty, save }) => { if (dirty) save(); });
  };
  const stableSaveAll = useCallback(() => saveAllRef.current(), []);

  useEffect(() => {
    onDirtyChange(overallDirty, stableSaveAll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overallDirty]);

  // Keep the op edit cache in sync so remounts restore unsaved data.
  useEffect(() => {
    opEditsRef.current.set(operation.id, { name: opName, seq: opSeq, instructions: opInstructions, role: opRole, secondaryRole: opSecondaryRole });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opName, opSeq, opInstructions, opRole, opSecondaryRole]);

  function handleStepDirtyChange(stepId: string, dirty: boolean, save: () => void) {
    stepRegistry.current.set(stepId, { dirty, save });
    setAnyStepDirty([...stepRegistry.current.values()].some((s) => s.dirty));
  }

  return (
    <>
      {/* Op header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b hairline bg-ink-900/50 shrink-0">
        <span className="font-mono text-sm text-ink-400 shrink-0">Op</span>
        <input
          value={opSeq}
          onChange={(e) => setOpSeq(e.target.value)}
          inputMode="numeric"
          className="w-16 h-9 bg-ink-950 border hairline rounded-sm px-2 text-sm font-mono text-ink-100 focus:outline-none focus:border-accent text-center shrink-0" />
        <input value={opName} onChange={(e) => setOpName(e.target.value)}
          className="flex-1 h-9 bg-ink-950 border hairline rounded-sm px-3 text-base text-ink-100 focus:outline-none focus:border-accent" />
        <button
          onClick={() => { if (window.confirm(`Remove "${operation.name}" and all its steps?`)) run(() => mastersApi.removeOperation(masterId, operation.id), onRemoved); }}
          disabled={pending}
          className="h-9 px-3 text-xs uppercase tracking-wider text-signal-alert border border-signal-alert/30 rounded-sm hover:bg-signal-alert/10 disabled:opacity-50 shrink-0">
          Remove
        </button>
      </div>

      {/* Op-level instructions editor */}
      <OpInstructionsEditor
        masterId={masterId}
        opId={operation.id}
        value={opInstructions}
        onChange={setOpInstructions}
        attachments={operation.attachments ?? []}
        pending={pending}
        onAttachmentChange={() => run(() => Promise.resolve())}
      />

      {/* Op buyoff roles */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b hairline bg-ink-900/30 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-ink-400 shrink-0">Primary Buyoff</span>
        <RoleSelect value={opRole} onChange={setOpRole} roles={workRoles} disabled={pending} />
        <span className="text-[10px] uppercase tracking-widest text-ink-400 shrink-0">Secondary Buyoff</span>
        <RoleSelect value={opSecondaryRole} onChange={setOpSecondaryRole} roles={workRoles} disabled={pending} />
      </div>

      {/* Step cards (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        {sortedSteps.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-xs text-ink-500">
            No steps yet — add one below.
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {sortedSteps.map((step) => (
              <StepCard
                key={step.id} masterId={masterId} opId={operation.id} step={step}
                pending={pending} run={run}
                workRoles={workRoles}
                stepEditsRef={stepEditsRef}
                onDirtyChange={handleStepDirtyChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add step */}
      <div className="flex gap-2 px-5 py-4 border-t hairline shrink-0">
        <input value={newStepTitle} onChange={(e) => setNewStepTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newStepTitle.trim()) run(() => mastersApi.addStep(masterId, operation.id, newStepTitle.trim()), () => setNewStepTitle('')); }}
          placeholder="New step title…"
          className="flex-1 h-10 bg-ink-950 border hairline rounded-sm px-3 text-sm text-ink-100 focus:outline-none focus:border-accent" />
        <button
          onClick={() => run(() => mastersApi.addStep(masterId, operation.id, newStepTitle.trim()), () => setNewStepTitle(''))}
          disabled={pending || !newStepTitle.trim()}
          className="h-10 px-4 text-xs uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 rounded-sm hover:bg-accent/25 disabled:opacity-40 shrink-0">
          Add Step
        </button>
      </div>
    </>
  );
}

// ── Op instructions editor ────────────────────────────────────────────────────

function OpInstructionsEditor({ masterId, opId, value, onChange, attachments, pending, onAttachmentChange }: {
  masterId: string; opId: string;
  value: string; onChange: (v: string) => void;
  attachments: OperationAttachment[];
  pending: boolean;
  onAttachmentChange: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [htmlMode, setHtmlMode] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function toggleHtmlMode() {
    onChange(htmlMode ? htmlToText(value) : textToHtml(value));
    setHtmlMode((m) => !m);
  }

  function insertList(type: 'bullet' | 'numbered') {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value: v } = el;
    const before = v.slice(0, selectionStart);
    const selected = v.slice(selectionStart, selectionEnd);
    const after = v.slice(selectionEnd);

    if (selectionStart === selectionEnd) {
      const prefix = type === 'bullet' ? '- ' : '1. ';
      const newValue = before + prefix + after;
      onChange(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + prefix.length;
        el.focus();
      });
      return;
    }

    const lines = selected.split('\n');
    const formatted = lines
      .map((line, i) => (type === 'bullet' ? '- ' : `${i + 1}. `) + line)
      .join('\n');
    onChange(before + formatted + after);
    requestAnimationFrame(() => {
      el.selectionStart = selectionStart;
      el.selectionEnd = selectionStart + formatted.length;
      el.focus();
    });
  }

  return (
    <div className="border-b hairline bg-ink-900/30 shrink-0">
      {/* Section header */}
      <div className="flex items-center gap-2 px-5 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-ink-500 hover:text-ink-200 transition-colors shrink-0">
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
            className={`transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
            aria-hidden="true">
            <path d="M6 8.5L1 3.5h10L6 8.5z"/>
          </svg>
        </button>
        <span className="text-[10px] uppercase tracking-widest text-ink-400 flex-1">Op Instructions</span>
      </div>

      {/* Editor body */}
      {!collapsed && (
        <div className="grid grid-cols-[1fr_260px] divide-x divide-ink-700/60 border-t hairline min-h-[8rem]">
          {/* Instructions body */}
          <div className="flex flex-col">
            {/* Toolbar */}
            <div className="flex gap-1 px-3 pt-2 pb-1 border-b hairline bg-ink-900/20">
              <button
                type="button"
                onClick={() => insertList('bullet')}
                title="Bulleted list"
                disabled={htmlMode}
                className="w-8 h-7 flex items-center justify-center border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:pointer-events-none">
                <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor" aria-hidden="true">
                  <circle cx="1.5" cy="1.5" r="1.5"/>
                  <rect x="5" y="0.5" width="10" height="2" rx="0.5"/>
                  <circle cx="1.5" cy="6.5" r="1.5"/>
                  <rect x="5" y="5.5" width="10" height="2" rx="0.5"/>
                  <circle cx="1.5" cy="11.5" r="1.5"/>
                  <rect x="5" y="10.5" width="10" height="2" rx="0.5"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => insertList('numbered')}
                title="Numbered list"
                disabled={htmlMode}
                className="w-8 h-7 flex items-center justify-center border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:pointer-events-none">
                <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor" aria-hidden="true">
                  <text x="0" y="3.5" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">1.</text>
                  <rect x="6" y="0.5" width="9" height="2" rx="0.5"/>
                  <text x="0" y="8.5" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">2.</text>
                  <rect x="6" y="5.5" width="9" height="2" rx="0.5"/>
                  <text x="0" y="13" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">3.</text>
                  <rect x="6" y="10.5" width="9" height="2" rx="0.5"/>
                </svg>
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={toggleHtmlMode}
                title={htmlMode ? 'Switch to plain text' : 'Switch to HTML'}
                className={`h-7 px-2 font-mono text-xs border rounded-sm transition-colors ${
                  htmlMode
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-hairline text-ink-300 hover:border-accent hover:text-accent'
                }`}>
                {'</>'}
              </button>
            </div>
            <div className="p-4 flex-1">
              <textarea
                ref={bodyRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={htmlMode ? '<p>Enter HTML…</p>' : 'Describe the overall goal and context for this operation…'}
                rows={4}
                className={`w-full bg-transparent text-sm text-ink-100 leading-relaxed focus:outline-none resize-none placeholder:text-ink-600 ${htmlMode ? 'font-mono' : ''}`}
              />
            </div>
          </div>

          {/* Attachments panel */}
          <OpAttachmentsPanel
            masterId={masterId}
            opId={opId}
            attachments={attachments}
            pending={pending}
            onUploaded={onAttachmentChange}
            onDeleted={onAttachmentChange}
          />
        </div>
      )}
    </div>
  );
}

// ── Op attachments panel ──────────────────────────────────────────────────────

function OpAttachmentsPanel({ masterId, opId, attachments, pending, onUploaded, onDeleted }: {
  masterId: string; opId: string;
  attachments: OperationAttachment[]; pending: boolean;
  onUploaded: () => void; onDeleted: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await mastersApi.uploadOpAttachment(masterId, opId, file);
      }
      onUploaded();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(attachmentId: string) {
    try {
      await mastersApi.deleteOpAttachment(masterId, opId, attachmentId);
      onDeleted();
    } catch { /* ignore */ }
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault(); }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const isImage = (ct: string) => ct.startsWith('image/');

  return (
    <div
      className={`p-4 flex flex-col gap-3 transition-colors ${dragging ? 'bg-accent/5' : ''}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-ink-400">Attachments</span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || pending}
          className="h-7 px-2 text-xs uppercase tracking-wider border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent disabled:opacity-40 transition-colors">
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploadError && <div className="text-[10px] text-signal-alert font-mono">{uploadError}</div>}

      {attachments.length === 0 && !uploading ? (
        <button onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center h-20 border border-dashed rounded-sm text-xs gap-1 transition-colors ${
            dragging
              ? 'border-accent text-accent bg-accent/10'
              : 'border-ink-700 text-ink-500 hover:border-ink-500 hover:text-ink-300'
          }`}>
          <span className="text-xl leading-none">{dragging ? '↓' : '+'}</span>
          <span>{dragging ? 'Drop to upload' : 'Add photo or file'}</span>
        </button>
      ) : (
        <>
          {dragging && (
            <div className="flex items-center justify-center h-10 border border-dashed border-accent rounded-sm text-xs text-accent gap-1">
              <span>↓</span><span>Drop to upload</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="group relative">
                {isImage(a.contentType) ? (
                  <a href={mastersApi.opAttachmentFileUrl(masterId, opId, a.id)}
                    target="_blank" rel="noopener noreferrer">
                    <img
                      src={mastersApi.opAttachmentFileUrl(masterId, opId, a.id)}
                      alt={a.fileName}
                      className="w-full h-20 object-cover rounded-sm border hairline hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <a href={mastersApi.opAttachmentFileUrl(masterId, opId, a.id)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center h-20 bg-ink-800 border hairline rounded-sm hover:bg-ink-700 transition-colors gap-1 text-center px-1">
                    <span className="text-lg leading-none text-ink-300">📎</span>
                    <span className="text-[9px] text-ink-400 truncate w-full text-center">{a.fileName}</span>
                  </a>
                )}
                <button
                  onClick={() => handleDelete(a.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink-900/80 text-signal-alert text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-signal-alert hover:text-white">
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({ masterId, opId, step, pending, run, onDirtyChange, stepEditsRef, workRoles }: {
  masterId: string; opId: string; step: Step; pending: boolean;
  run: (fn: () => Promise<unknown>, after?: (result: unknown) => void) => void;
  onDirtyChange: (stepId: string, dirty: boolean, save: () => void) => void;
  stepEditsRef: React.MutableRefObject<Map<string, { title: string; body: string | null; order: string; role: WorkRole | null; secondaryRole: WorkRole | null }>>;
  workRoles: WorkRoleOption[];
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const cachedStep = stepEditsRef.current.get(step.id);
  const [title, setTitle] = useState(cachedStep?.title ?? step.title);
  const [body, setBody] = useState(cachedStep?.body ?? step.body);
  const [stepOrder, setStepOrder] = useState(cachedStep?.order ?? String(step.order));
  const [role, setRole] = useState<WorkRole | null>(cachedStep?.role ?? step.primaryBuyoffRole);
  const [secondaryRole, setSecondaryRole] = useState<WorkRole | null>(cachedStep?.secondaryRole ?? step.secondaryBuyoffRole);
  const [htmlMode, setHtmlMode] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const parsedOrder = parseInt(stepOrder, 10);
  const dirty = (title.trim() !== step.title && title.trim() !== '') || body !== step.body ||
    (!isNaN(parsedOrder) && parsedOrder !== step.order) ||
    role !== step.primaryBuyoffRole || secondaryRole !== step.secondaryBuyoffRole;

  const saveRef = useRef<() => void>(() => {});
  saveRef.current = () => run(() => mastersApi.updateStep(masterId, opId, step.id, {
    order: isNaN(parsedOrder) ? step.order : parsedOrder,
    title: title.trim(),
    body,
    primaryBuyoffRole: role,
    secondaryBuyoffRole: secondaryRole,
  }));
  const stableSave = useCallback(() => saveRef.current(), []);

  useEffect(() => {
    onDirtyChange(step.id, dirty, stableSave);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  // Keep the step edit cache in sync so remounts restore unsaved data.
  useEffect(() => {
    stepEditsRef.current.set(step.id, { title, body, order: stepOrder, role, secondaryRole });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, stepOrder, role, secondaryRole]);

  function toggleHtmlMode() {
    setBody((prev) => (htmlMode ? htmlToText(prev) : textToHtml(prev)));
    setHtmlMode((m) => !m);
  }

  function insertList(type: 'bullet' | 'numbered') {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);

    if (selectionStart === selectionEnd) {
      const prefix = type === 'bullet' ? '- ' : '1. ';
      const newValue = before + prefix + after;
      setBody(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + prefix.length;
        el.focus();
      });
      return;
    }

    const lines = selected.split('\n');
    const formatted = lines
      .map((line, i) => (type === 'bullet' ? '- ' : `${i + 1}. `) + line)
      .join('\n');
    setBody(before + formatted + after);
    requestAnimationFrame(() => {
      el.selectionStart = selectionStart;
      el.selectionEnd = selectionStart + formatted.length;
      el.focus();
    });
  }

  return (
    <div className="surface border hairline rounded-sm overflow-hidden">
      {/* Header bar: step number + title + actions */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-ink-800/50 border-b hairline">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-ink-500 hover:text-ink-200 transition-colors shrink-0">
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
            className={`transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
            aria-hidden="true">
            <path d="M6 8.5L1 3.5h10L6 8.5z"/>
          </svg>
        </button>
        <span className="font-mono text-sm font-semibold text-ink-300 shrink-0">Step</span>
        <input
          value={stepOrder}
          onChange={(e) => setStepOrder(e.target.value)}
          inputMode="numeric"
          className="w-14 h-8 bg-ink-950 border hairline rounded-sm px-2 text-sm font-mono text-ink-100 focus:outline-none focus:border-accent text-center shrink-0" />
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Step title…"
          className="flex-1 h-8 bg-ink-950 border hairline rounded-sm px-2 text-sm text-ink-100 focus:outline-none focus:border-accent" />
        <button
          onClick={() => run(() => mastersApi.removeStep(masterId, opId, step.id))}
          disabled={pending}
          className="h-8 px-2 text-xs text-signal-alert hover:underline disabled:opacity-50 shrink-0">
          Remove
        </button>
      </div>

      {/* Body + Attachments */}
      {!collapsed && <div className="grid grid-cols-[1fr_260px] divide-x divide-ink-700/60 min-h-[10rem]">
        {/* Instructions body */}
        <div className="flex flex-col">
          {/* List toolbar */}
          <div className="flex gap-1 px-3 pt-2 pb-1 border-b hairline bg-ink-900/30">
            <button
              type="button"
              onClick={() => insertList('bullet')}
              title="Bulleted list"
              disabled={htmlMode}
              className="w-8 h-7 flex items-center justify-center border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:pointer-events-none">
              <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor" aria-hidden="true">
                <circle cx="1.5" cy="1.5" r="1.5"/>
                <rect x="5" y="0.5" width="10" height="2" rx="0.5"/>
                <circle cx="1.5" cy="6.5" r="1.5"/>
                <rect x="5" y="5.5" width="10" height="2" rx="0.5"/>
                <circle cx="1.5" cy="11.5" r="1.5"/>
                <rect x="5" y="10.5" width="10" height="2" rx="0.5"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertList('numbered')}
              title="Numbered list"
              disabled={htmlMode}
              className="w-8 h-7 flex items-center justify-center border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:pointer-events-none">
              <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor" aria-hidden="true">
                <text x="0" y="3.5" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">1.</text>
                <rect x="6" y="0.5" width="9" height="2" rx="0.5"/>
                <text x="0" y="8.5" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">2.</text>
                <rect x="6" y="5.5" width="9" height="2" rx="0.5"/>
                <text x="0" y="13" fontSize="5.5" fontFamily="sans-serif" fontWeight="600">3.</text>
                <rect x="6" y="10.5" width="9" height="2" rx="0.5"/>
              </svg>
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={toggleHtmlMode}
              title={htmlMode ? 'Switch to plain text' : 'Switch to HTML'}
              className={`h-7 px-2 font-mono text-xs border rounded-sm transition-colors ${
                htmlMode
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-hairline text-ink-300 hover:border-accent hover:text-accent'
              }`}>
              {'</>'}
            </button>
          </div>
          <div className="p-4 flex-1">
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={htmlMode ? '<p>Enter HTML…</p>' : 'Describe what the operator needs to do…'}
              rows={6}
              className={`w-full bg-transparent text-sm text-ink-100 leading-relaxed focus:outline-none resize-none placeholder:text-ink-600 ${htmlMode ? 'font-mono' : ''}`}
            />
          </div>
        </div>

        {/* Attachments panel */}
        <AttachmentsPanel
          masterId={masterId} opId={opId} stepId={step.id}
          attachments={step.attachments} pending={pending}
          onUploaded={() => router.refresh()}
          onDeleted={() => run(() => Promise.resolve())}
        />
      </div>}

      {/* Buyoff roles */}
      {!collapsed && (
        <div className="flex items-center gap-4 px-4 py-2.5 border-t hairline bg-ink-900/30">
          <span className="text-[10px] uppercase tracking-widest text-ink-400 shrink-0">Primary Buyoff</span>
          <RoleSelect value={role} onChange={setRole} roles={workRoles} disabled={pending} />
          <span className="text-[10px] uppercase tracking-widest text-ink-400 shrink-0">Secondary Buyoff</span>
          <RoleSelect value={secondaryRole} onChange={setSecondaryRole} roles={workRoles} disabled={pending} />
        </div>
      )}
    </div>
  );
}

// ── Attachments panel ─────────────────────────────────────────────────────────

function AttachmentsPanel({ masterId, opId, stepId, attachments, pending, onUploaded, onDeleted }: {
  masterId: string; opId: string; stepId: string;
  attachments: StepAttachment[]; pending: boolean;
  onUploaded: () => void; onDeleted: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await mastersApi.uploadAttachment(masterId, opId, stepId, file);
      }
      onUploaded();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(attachmentId: string) {
    try {
      await mastersApi.deleteAttachment(masterId, opId, stepId, attachmentId);
      onDeleted();
    } catch { /* ignore */ }
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const isImage = (ct: string) => ct.startsWith('image/');

  return (
    <div
      className={`p-4 flex flex-col gap-3 transition-colors ${dragging ? 'bg-accent/5' : ''}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-ink-400">Attachments</span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || pending}
          className="h-7 px-2 text-xs uppercase tracking-wider border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent disabled:opacity-40 transition-colors">
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploadError && <div className="text-[10px] text-signal-alert font-mono">{uploadError}</div>}

      {attachments.length === 0 && !uploading ? (
        <button onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center h-20 border border-dashed rounded-sm text-xs gap-1 transition-colors ${
            dragging
              ? 'border-accent text-accent bg-accent/10'
              : 'border-ink-700 text-ink-500 hover:border-ink-500 hover:text-ink-300'
          }`}>
          <span className="text-xl leading-none">{dragging ? '↓' : '+'}</span>
          <span>{dragging ? 'Drop to upload' : 'Add photo or file'}</span>
        </button>
      ) : (
        <>
          {dragging && (
            <div className="flex items-center justify-center h-10 border border-dashed border-accent rounded-sm text-xs text-accent gap-1">
              <span>↓</span><span>Drop to upload</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="group relative">
                {isImage(a.contentType) ? (
                  <a href={mastersApi.attachmentFileUrl(masterId, opId, stepId, a.id)}
                    target="_blank" rel="noopener noreferrer">
                    <img
                      src={mastersApi.attachmentFileUrl(masterId, opId, stepId, a.id)}
                      alt={a.fileName}
                      className="w-full h-20 object-cover rounded-sm border hairline hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <a href={mastersApi.attachmentFileUrl(masterId, opId, stepId, a.id)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center h-20 bg-ink-800 border hairline rounded-sm hover:bg-ink-700 transition-colors gap-1 text-center px-1">
                    <span className="text-lg leading-none text-ink-300">📎</span>
                    <span className="text-[9px] text-ink-400 truncate w-full text-center">{a.fileName}</span>
                  </a>
                )}
                <button
                  onClick={() => handleDelete(a.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink-900/80 text-signal-alert text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-signal-alert hover:text-white">
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
