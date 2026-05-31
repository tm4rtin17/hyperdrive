'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  mastersApi,
  type EngineeringMaster,
  type Operation,
  type Step,
  type StepAttachment,
} from '@/modules/manufacturing/planning/api';
import { ApiError } from '@/shared/lib/api/client';
import { SequenceEditor } from '@/modules/manufacturing/planning/components/SequenceEditor';

export function MasterBuilder({ master }: { master: EngineeringMaster }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showSequence, setShowSequence] = useState(false);
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
    <div className="flex" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Operations sidebar ── */}
      <aside className="w-64 flex flex-col border-r hairline bg-ink-900/60 shrink-0">
        <div className="px-4 pt-5 pb-4 border-b hairline">
          <Link href="/manufacturing/planning"
            className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-accent transition-colors">
            ← Planning
          </Link>
          <div className="mt-2 font-mono text-base text-ink-100 leading-tight">{master.partNumber}</div>
          <div className="text-xs text-ink-400 truncate">
            {master.partName ?? <span className="italic text-ink-500">unlinked part</span>}
          </div>
          <div className="mt-2 inline-flex items-center px-2 h-5 text-[10px] uppercase tracking-widest border rounded-sm bg-accent/10 text-accent border-accent/30">
            {master.status}
          </div>
          <button
            onClick={() => setShowSequence(true)}
            className="mt-3 w-full h-8 flex items-center justify-center gap-2 text-xs uppercase tracking-wider border border-accent/30 text-accent rounded-sm hover:bg-accent/15 transition-colors">
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

      {/* ── Steps panel ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {globalError && (
          <div className="px-5 py-2 text-xs text-signal-alert font-mono bg-ink-900 border-b hairline shrink-0">
            {globalError}
          </div>
        )}
        {selectedOp === null ? (
          <div className="flex-1 flex items-center justify-center text-sm text-ink-400">
            Add an operation to begin.
          </div>
        ) : (
          <StepsPanel
            key={selectedOp.id} masterId={master.id} operation={selectedOp}
            pending={pending} run={run}
            onRemoved={() => setSelectedOpId(sortedOps.find((o) => o.id !== selectedOp.id)?.id ?? null)}
          />
        )}
      </main>
    </div>
    {showSequence && <SequenceEditor master={master} onClose={() => setShowSequence(false)} />}
    </>
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

// ── Steps panel ──────────────────────────────────────────────────────────────

function StepsPanel({ masterId, operation, pending, run, onRemoved }: {
  masterId: string; operation: Operation; pending: boolean;
  run: (fn: () => Promise<unknown>, after?: (result: unknown) => void) => void;
  onRemoved: () => void;
}) {
  const [opName, setOpName] = useState(operation.name);
  const [opSeq, setOpSeq] = useState(String(operation.sequence));
  const [newStepTitle, setNewStepTitle] = useState('');
  const parsedSeq = parseInt(opSeq, 10);
  const dirty = (opName.trim() !== '' && opName.trim() !== operation.name) ||
    (!isNaN(parsedSeq) && parsedSeq !== operation.sequence);
  const sortedSteps = [...operation.steps].sort((a, b) => a.order - b.order);

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
        {dirty && (
          <button
            onClick={() => run(() => mastersApi.updateOperation(masterId, operation.id, { sequence: isNaN(parsedSeq) ? operation.sequence : parsedSeq, name: opName.trim() }))}
            disabled={pending}
            className="h-9 px-3 text-xs uppercase tracking-wider text-accent border border-accent/30 rounded-sm hover:bg-accent/15 disabled:opacity-50 shrink-0">
            Save
          </button>
        )}
        <button
          onClick={() => { if (window.confirm(`Remove "${operation.name}" and all its steps?`)) run(() => mastersApi.removeOperation(masterId, operation.id), onRemoved); }}
          disabled={pending}
          className="h-9 px-3 text-xs uppercase tracking-wider text-signal-alert border border-signal-alert/30 rounded-sm hover:bg-signal-alert/10 disabled:opacity-50 shrink-0">
          Remove
        </button>
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
              <StepCard key={step.id} masterId={masterId} opId={operation.id} step={step} pending={pending} run={run} />
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

// ── HTML ↔ plain-text helpers ─────────────────────────────────────────────────

function textToHtml(text: string): string {
  if (!text.trim()) return '';
  const lines = text.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  for (const line of lines) {
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (bullet) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`  <li>${bullet[1]}</li>`);
    } else if (numbered) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`  <li>${numbered[1]}</li>`);
    } else {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push(line.trim() ? `<p>${line}</p>` : '');
    }
  }
  if (inUl) out.push('</ul>');
  if (inOl) out.push('</ol>');
  return out.join('\n');
}

function htmlToText(html: string): string {
  let t = html;
  t = t.replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, c) => {
    let i = 0;
    return c.replace(/<li>([\s\S]*?)<\/li>/gi, (_: string, item: string) => `${++i}. ${item.trim()}\n`);
  });
  t = t.replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, c) =>
    c.replace(/<li>([\s\S]*?)<\/li>/gi, (_: string, item: string) => `- ${item.trim()}\n`),
  );
  return t
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({ masterId, opId, step, pending, run }: {
  masterId: string; opId: string; step: Step; pending: boolean;
  run: (fn: () => Promise<unknown>, after?: (result: unknown) => void) => void;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [body, setBody] = useState(step.body);
  const [stepOrder, setStepOrder] = useState(String(step.order));
  const [htmlMode, setHtmlMode] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const parsedOrder = parseInt(stepOrder, 10);
  const dirty = (title.trim() !== step.title && title.trim() !== '') || body !== step.body ||
    (!isNaN(parsedOrder) && parsedOrder !== step.order);

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
        {dirty && (
          <button
            onClick={() => run(() => mastersApi.updateStep(masterId, opId, step.id, { order: isNaN(parsedOrder) ? step.order : parsedOrder, title: title.trim(), body }))}
            disabled={pending}
            className="h-8 px-3 text-xs uppercase tracking-wider text-accent border border-accent/30 rounded-sm hover:bg-accent/15 disabled:opacity-50 shrink-0">
            Save
          </button>
        )}
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
