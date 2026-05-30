'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  partsApi,
  PART_TYPES,
  PART_TYPE_LABELS,
  UNITS_OF_MEASURE,
  SOURCING_TYPES,
  TRACEABILITY_TYPES,
  SERIAL_ASSIGNMENTS,
  SERIAL_ASSIGNMENT_LABELS,
  type Part,
  type PartType,
  type UnitOfMeasure,
  type SourcingType,
  type TraceabilityType,
  type SerialAssignment,
} from '@/modules/manufacturing/parts/api';
import { ApiError } from '@/shared/lib/api/client';

export function PartDetailForm({ part }: { part: Part }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [partType, setPartType] = useState<PartType>(part.partType);
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>(part.unitOfMeasure);
  const [sourcing, setSourcing] = useState<SourcingType>(part.sourcing);
  const [material, setMaterial] = useState(part.material ?? '');
  const [mass, setMass] = useState(part.massGrams != null ? String(part.massGrams) : '');
  const [traceability, setTraceability] = useState<TraceabilityType>(part.traceabilityType);
  const [serialAssignment, setSerialAssignment] = useState<SerialAssignment>(
    part.serialAssignment ?? 'Auto',
  );
  const [serialFormat, setSerialFormat] = useState(part.serialFormat ?? '');

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function dirtySetter<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setSaved(false);
    };
  }

  function onSave() {
    setError(null);
    setSaved(false);
    start(async () => {
      try {
        await partsApi.update(part.id, {
          partType,
          unitOfMeasure,
          sourcing,
          material: material.trim() || null,
          massGrams: mass.trim() === '' ? null : Number(mass),
          traceabilityType: traceability,
          serialAssignment: traceability === 'Serial' ? serialAssignment : null,
          serialFormat: traceability === 'Serial' ? serialFormat.trim() || null : null,
        });
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unexpected error saving part.');
      }
    });
  }

  return (
    <div className="space-y-6">
      <Section title="Classification">
        <Row label="Part Type">
          <Select value={partType} onChange={dirtySetter(setPartType)}>
            {PART_TYPES.map((t) => (
              <option key={t} value={t}>
                {PART_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="Unit of Measure">
          <Select value={unitOfMeasure} onChange={dirtySetter(setUnitOfMeasure)}>
            {UNITS_OF_MEASURE.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="Sourcing">
          <Select value={sourcing} onChange={dirtySetter(setSourcing)}>
            {SOURCING_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Row>
      </Section>

      <Section title="Physical">
        <Row label="Material">
          <input
            value={material}
            onChange={(e) => dirtySetter(setMaterial)(e.target.value)}
            placeholder="Ti-6Al-4V"
            className={inputCls}
          />
        </Row>
        <Row label="Mass (g)">
          <input
            type="number"
            step="any"
            value={mass}
            onChange={(e) => dirtySetter(setMass)(e.target.value)}
            placeholder="412.7"
            className={`${inputCls} font-mono`}
          />
        </Row>
      </Section>

      <Section title="Traceability">
        <Row label="Tracking">
          <Select value={traceability} onChange={dirtySetter(setTraceability)}>
            {TRACEABILITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'None' ? 'None — not individually tracked' : t}
              </option>
            ))}
          </Select>
        </Row>
        {traceability === 'Serial' && (
          <>
            <Row label="Serial Assignment">
              <Select value={serialAssignment} onChange={dirtySetter(setSerialAssignment)}>
                {SERIAL_ASSIGNMENTS.map((a) => (
                  <option key={a} value={a}>
                    {SERIAL_ASSIGNMENT_LABELS[a]}
                  </option>
                ))}
              </Select>
            </Row>
            <Row label="Serial Format">
              <input
                value={serialFormat}
                onChange={(e) => dirtySetter(setSerialFormat)(e.target.value)}
                placeholder="HD-NOZ-{SEQ:0000}"
                className={`${inputCls} font-mono`}
              />
            </Row>
          </>
        )}
      </Section>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={pending}
          className="h-11 px-5 bg-accent text-ink-950 text-sm font-semibold uppercase tracking-wider rounded-sm hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-xs text-signal-ok font-mono">Saved.</span>}
        {error && <span className="text-xs text-signal-alert font-mono">{error}</span>}
      </div>
    </div>
  );
}

const inputCls =
  'w-full h-11 bg-ink-950 border hairline rounded-sm px-3 text-ink-100 focus:outline-none focus:border-accent';

function Select<T extends string>({
  value,
  onChange,
  children,
}: {
  value: T;
  onChange: (v: T) => void;
  children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
      {children}
    </select>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface rounded-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-ink-800/60 text-[10px] uppercase tracking-widest text-ink-400">
        {title}
      </div>
      <div className="divide-y divide-ink-700/60">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3">
      <div className="w-48 shrink-0 text-sm text-ink-200">{label}</div>
      <div className="flex-1 min-w-[240px] max-w-md">{children}</div>
    </div>
  );
}
