'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mastersApi, type EngineeringMaster, type MasterAttachment } from '@/modules/manufacturing/planning/api';
import { RichTextEditor } from '@/modules/manufacturing/planning/components/RichTextEditor';

export type HeaderEditorHandle = {
  save: () => void;
  isDirty: () => boolean;
};

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export const HeaderEditor = forwardRef<HeaderEditorHandle, {
  master: EngineeringMaster;
  pending: boolean;
  run: (fn: () => Promise<unknown>, after?: (result: unknown) => void) => void;
  onDirtyChange: (dirty: boolean, canSave: boolean) => void;
}>(function HeaderEditor({ master, pending, run, onDirtyChange }, ref) {
  const [partNumber, setPartNumber] = useState(master.partNumber);
  const [revision, setRevision] = useState(master.revision);
  const [description, setDescription] = useState(master.description);
  const [changelog, setChangelog] = useState(master.changelog);
  const [approvers, setApprovers] = useState<string[]>(master.approvers);
  const [newApprover, setNewApprover] = useState('');

  const normalizedRevision = revision.trim().toUpperCase();
  const dirty =
    partNumber.trim() !== master.partNumber ||
    normalizedRevision !== master.revision ||
    description !== master.description ||
    changelog !== master.changelog ||
    !sameList(approvers, master.approvers);

  const revisionValid = /^[A-Z]{1,3}$/.test(normalizedRevision);
  const canSave = !pending && !!partNumber.trim() && revisionValid;

  function save() {
    if (!canSave) return;
    run(() => mastersApi.updateHeader(master.id, {
      partNumber: partNumber.trim(),
      revision: normalizedRevision,
      description,
      changelog,
      approvers,
    }));
  }

  // No deps array — always exposes closures over the latest render's values.
  useImperativeHandle(ref, () => ({ save, isDirty: () => dirty }));

  useEffect(() => {
    onDirtyChange(dirty, canSave);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, canSave]);

  function addApprover() {
    const name = newApprover.trim();
    setNewApprover('');
    if (!name || approvers.includes(name)) return;
    setApprovers((a) => [...a, name]);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Action bar: part number left, save right ── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b hairline bg-ink-900/50 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-ink-500 shrink-0">Part No.</span>
        <input
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          maxLength={64}
          placeholder="Part number…"
          className="w-44 h-7 bg-ink-950 border hairline rounded-sm px-2 text-sm font-mono text-ink-100 focus:outline-none focus:border-accent shrink-0" />
        <span className="text-ink-700 shrink-0 select-none">/</span>
        <span className="text-[10px] uppercase tracking-widest text-ink-500 shrink-0">Rev.</span>
        <input
          value={revision}
          onChange={(e) => setRevision(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          maxLength={3}
          placeholder="A"
          title="Revision — uppercase letters only (A, B, C… AA, AB…)"
          className={`w-12 h-7 bg-ink-950 border rounded-sm px-2 text-sm font-mono text-center focus:outline-none shrink-0 ${
            revisionValid ? 'hairline focus:border-accent text-ink-100' : 'border-signal-alert text-signal-alert'
          }`} />
        {master.partName && (
          <span className="text-xs text-ink-500 truncate hidden sm:block">{master.partName}</span>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[1fr_296px] gap-6 px-6 py-5 min-h-full">

          {/* ── Left column: Description + Changelog ── */}
          <div className="flex flex-col gap-6 min-w-0">

            <section>
              <SectionLabel>Description / Notes</SectionLabel>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="General information, notes, or context about this product…"
                rows={10}
              />
            </section>

            <section>
              <SectionLabel>Changelog</SectionLabel>
              <RichTextEditor
                value={changelog}
                onChange={setChangelog}
                placeholder="Manually record revision history here…"
                rows={8}
              />
            </section>

          </div>

          {/* ── Right column: Attachments + Approvers ── */}
          <div className="flex flex-col gap-5 min-w-0">

            <section>
              <SectionLabel>Attachments</SectionLabel>
              <MasterAttachmentsPanel
                masterId={master.id}
                attachments={master.attachments}
                pending={pending}
                onChanged={() => run(() => Promise.resolve())}
              />
            </section>

            <section>
              <SectionLabel>Approvers</SectionLabel>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {approvers.length === 0 ? (
                    <span className="text-xs text-ink-600 italic">None added yet.</span>
                  ) : approvers.map((name) => (
                    <span key={name}
                      className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 bg-ink-800 border hairline rounded-sm text-xs text-ink-200">
                      {name}
                      <button
                        onClick={() => setApprovers((a) => a.filter((n) => n !== name))}
                        className="w-3.5 h-3.5 flex items-center justify-center text-ink-500 hover:text-signal-alert"
                        title="Remove">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={newApprover}
                    onChange={(e) => setNewApprover(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addApprover(); } }}
                    placeholder="Name…"
                    className="flex-1 h-8 bg-ink-950 border hairline rounded-sm px-2 text-xs text-ink-100 focus:outline-none focus:border-accent min-w-0" />
                  <button
                    onClick={addApprover}
                    disabled={!newApprover.trim()}
                    className="h-8 px-2.5 text-xs uppercase tracking-wider border hairline text-ink-300 rounded-sm hover:border-accent hover:text-accent disabled:opacity-40 shrink-0">
                    Add
                  </button>
                </div>
                <p className="text-[10px] text-ink-600">Placeholder — approval workflow coming later.</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">{children}</h3>
  );
}

// ── Master attachments panel ──────────────────────────────────────────────────

function MasterAttachmentsPanel({ masterId, attachments, pending, onChanged }: {
  masterId: string;
  attachments: MasterAttachment[];
  pending: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
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
        await mastersApi.uploadMasterAttachment(masterId, file);
      }
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(attachmentId: string) {
    try {
      await mastersApi.deleteMasterAttachment(masterId, attachmentId);
      onChanged();
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
      className={`border hairline rounded-sm p-3 flex flex-col gap-2.5 transition-colors ${dragging ? 'bg-accent/5 border-accent' : ''}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-ink-600">
          {attachments.length} file{attachments.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || pending}
          className="h-6 px-2 text-[10px] uppercase tracking-wider border hairline text-ink-400 rounded-sm hover:border-accent hover:text-accent disabled:opacity-40 transition-colors">
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploadError && <div className="text-[10px] text-signal-alert font-mono">{uploadError}</div>}

      {attachments.length === 0 && !uploading ? (
        <button onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center h-16 border border-dashed rounded-sm text-xs gap-1 transition-colors ${
            dragging
              ? 'border-accent text-accent bg-accent/10'
              : 'border-ink-700 text-ink-500 hover:border-ink-500 hover:text-ink-300'
          }`}>
          <span className="text-base leading-none">{dragging ? '↓' : '+'}</span>
          <span className="text-[10px]">{dragging ? 'Drop to upload' : 'Drop or click to add'}</span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="group relative">
              {isImage(a.contentType) ? (
                <a href={mastersApi.masterAttachmentFileUrl(masterId, a.id)}
                  target="_blank" rel="noopener noreferrer">
                  <img
                    src={mastersApi.masterAttachmentFileUrl(masterId, a.id)}
                    alt={a.fileName}
                    className="w-full h-16 object-cover rounded-sm border hairline hover:opacity-90 transition-opacity"
                  />
                </a>
              ) : (
                <a href={mastersApi.masterAttachmentFileUrl(masterId, a.id)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center h-16 bg-ink-800 border hairline rounded-sm hover:bg-ink-700 transition-colors gap-0.5 text-center px-1">
                  <span className="text-base leading-none text-ink-400">📎</span>
                  <span className="text-[8px] text-ink-500 truncate w-full text-center">{a.fileName}</span>
                </a>
              )}
              <button
                onClick={() => handleDelete(a.id)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-ink-900/80 text-signal-alert text-[9px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-signal-alert hover:text-white">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
