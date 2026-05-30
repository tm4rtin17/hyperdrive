import { PageHeader } from '@/shared/components/ui/PageHeader';

export default function PlanningPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <PageHeader
        eyebrow="Manufacturing"
        title="Manufacturing Planning"
        description="Author work instructions and release work orders. Op sequences are embedded in each work instruction and snapshotted onto the work order at release."
      />
      <PlanningPlaceholder />
    </div>
  );
}

function PlanningPlaceholder() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[
        { label: 'Work Instructions', value: '—', hint: 'Op sequences by part master' },
        { label: 'Work Orders', value: '—', hint: 'Released to the floor' },
      ].map((m) => (
        <div key={m.label} className="surface rounded-sm p-5">
          <div className="text-[10px] uppercase tracking-widest text-ink-400">{m.label}</div>
          <div className="mt-2 text-3xl font-mono tabular-nums text-ink-100">{m.value}</div>
          <div className="mt-1 text-xs text-ink-400">{m.hint}</div>
        </div>
      ))}
      <div className="lg:col-span-2 surface rounded-sm px-6 py-16 text-center">
        <div className="text-sm text-ink-300">Planning module scaffold.</div>
        <div className="mt-1 text-xs text-ink-400">
          WorkInstruction and WorkOrder aggregates live in
          <span className="font-mono text-ink-300"> Hyperdrive.Manufacturing.Domain/Planning</span>.
        </div>
      </div>
    </div>
  );
}
