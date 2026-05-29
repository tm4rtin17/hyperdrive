import { PageHeader } from '@/shared/components/ui/PageHeader';

export default function ExecutionPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <PageHeader
        eyebrow="Manufacturing"
        title="Work Order Execution"
        description="Search work orders, drive operator workflows, and capture in-process data on the floor."
      />
      <ExecutionPlaceholder />
    </div>
  );
}

function ExecutionPlaceholder() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="surface rounded-sm p-5">
        <div className="text-[10px] uppercase tracking-widest text-ink-400">Search Work Order</div>
        <input
          disabled
          placeholder="WO-… or scan barcode"
          className="mt-3 w-full h-14 font-mono bg-ink-950 border hairline rounded-sm px-4 text-lg text-ink-100 disabled:opacity-50"
        />
        <div className="mt-3 text-xs text-ink-400">
          Operator-first surface. Optimized for 1080p touchscreens and barcode scanners.
        </div>
      </div>
      <div className="surface rounded-sm p-5">
        <div className="text-[10px] uppercase tracking-widest text-ink-400">Active Stations</div>
        <div className="mt-3 text-3xl font-mono tabular-nums text-ink-100">—</div>
        <div className="mt-1 text-xs text-ink-400">Live count of stations with an open work order.</div>
      </div>
      <div className="md:col-span-2 surface rounded-sm px-6 py-16 text-center">
        <div className="text-sm text-ink-300">Execution module scaffold.</div>
        <div className="mt-1 text-xs text-ink-400">
          WorkOrderExecution, OperationLog, NonConformanceReport aggregates live in
          <span className="font-mono text-ink-300"> Hyperdrive.Manufacturing.Domain/Execution</span>.
        </div>
      </div>
    </div>
  );
}
