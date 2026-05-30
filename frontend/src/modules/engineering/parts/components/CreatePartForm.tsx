'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { partsApi } from '@/modules/engineering/parts/api';
import { ApiError } from '@/shared/lib/api/client';

export function CreatePartForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [partNumber, setPartNumber] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await partsApi.create({ partNumber, name });
        setPartNumber('');
        setName('');
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unexpected error.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="surface rounded-sm p-4 flex flex-wrap items-end gap-3">
      <Field label="Part Number" hint="e.g. HD-FRAME-001" className="flex-1 min-w-[200px]">
        <input
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          placeholder="HD-FRAME-001"
          className="font-mono uppercase w-full h-11 bg-ink-950 border hairline rounded-sm px-3 text-ink-100 focus:outline-none focus:border-accent"
          required
        />
      </Field>
      <Field label="Name" className="flex-[2] min-w-[280px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Primary Structure Frame, Forward"
          className="w-full h-11 bg-ink-950 border hairline rounded-sm px-3 text-ink-100 focus:outline-none focus:border-accent"
          required
        />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="h-11 px-5 bg-accent text-ink-950 text-sm font-semibold uppercase tracking-wider rounded-sm hover:bg-accent/90 disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create Part'}
      </button>
      {error && (
        <div className="w-full text-xs text-signal-alert font-mono">{error}</div>
      )}
    </form>
  );
}

function Field({
  label,
  hint,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="text-[10px] uppercase tracking-widest text-ink-400 mb-1">
        {label}
        {hint && <span className="ml-2 text-ink-500 normal-case tracking-normal">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
