import Link from 'next/link';
import { notFound } from 'next/navigation';
import { partsApi, type Part } from '@/modules/engineering/parts/api';
import { lifecycleApi, type PartRevision, type BomLine } from '@/modules/engineering/lifecycle/api';
import { RevisionBar } from '@/modules/engineering/lifecycle/components/RevisionBar';
import { BomEditor } from '@/modules/engineering/lifecycle/components/BomEditor';

export const dynamic = 'force-dynamic';

export default async function LifecycleWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ partNumber: string }>;
  searchParams: Promise<{ rev?: string }>;
}) {
  const { partNumber } = await params;
  const { rev } = await searchParams;

  let part: Part;
  try {
    part = await partsApi.getByNumber(decodeURIComponent(partNumber));
  } catch {
    notFound();
  }

  const revisions = await lifecycleApi.listRevisions(part.id);
  if (revisions.length === 0) notFound();
  const current = revisions.reduce((a, b) => (b.ordinal > a.ordinal ? b : a));
  const selected: PartRevision = revisions.find((r) => r.id === rev) ?? current;

  let lines: BomLine[] = [];
  try {
    lines = await lifecycleApi.getBom(part.id, selected.id);
  } catch {
    lines = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="pb-6 mb-6 border-b hairline">
        <div className="text-[10px] uppercase tracking-widest text-ink-400 mb-1">
          <Link href="/engineering/lifecycle" className="hover:text-accent transition-colors">
            ← Lifecycle Management
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: part identity */}
          <div>
            <h1 className="text-2xl font-semibold text-ink-100">{part.partNumber}</h1>
            <p className="mt-0.5 text-sm text-ink-300">{part.name} · {part.partType}</p>
          </div>

          {/* Right: revision picker + actions + part-details link */}
          <div className="flex flex-wrap items-center gap-2">
            <RevisionBar partId={part.id} revisions={revisions} selectedRevId={selected.id} />
            <Link
              href={`/engineering/parts/${encodeURIComponent(part.partNumber)}`}
              className="h-9 px-4 inline-flex items-center text-xs uppercase tracking-wider border hairline rounded-sm text-ink-200 hover:border-accent hover:text-accent transition-colors"
            >
              Part Details
            </Link>
          </div>
        </div>
      </div>

      {/* BOM — full width */}
      <BomEditor partId={part.id} revision={selected} lines={lines} />
    </div>
  );
}
