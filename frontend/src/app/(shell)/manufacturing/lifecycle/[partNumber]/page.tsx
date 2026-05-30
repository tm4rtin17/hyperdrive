import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { partsApi, type Part } from '@/modules/manufacturing/parts/api';
import { lifecycleApi, type PartRevision, type BomLine } from '@/modules/manufacturing/lifecycle/api';
import { RevisionPanel } from '@/modules/manufacturing/lifecycle/components/RevisionPanel';
import { BomEditor } from '@/modules/manufacturing/lifecycle/components/BomEditor';

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
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        eyebrow={
          <Link href="/manufacturing/lifecycle" className="hover:text-accent transition-colors">
            ← Lifecycle Management
          </Link>
        }
        title={part.partNumber}
        description={`${part.name} · ${part.partType}`}
        actions={
          <Link
            href={`/manufacturing/parts/${encodeURIComponent(part.partNumber)}`}
            className="h-9 px-4 inline-flex items-center text-xs uppercase tracking-wider border hairline rounded-sm text-ink-200 hover:border-accent hover:text-accent transition-colors"
          >
            Part Details
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <RevisionPanel partId={part.id} revisions={revisions} selectedRevId={selected.id} />
        <BomEditor partId={part.id} revision={selected} lines={lines} />
      </div>
    </div>
  );
}
