import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { partsApi, type Part } from '@/modules/manufacturing/parts/api';
import { PartDetailForm } from '@/modules/manufacturing/parts/components/PartDetailForm';
import { DeletePartButton } from '@/modules/manufacturing/parts/components/DeletePartButton';

export const dynamic = 'force-dynamic';

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ partNumber: string }>;
}) {
  const { partNumber } = await params;

  let part: Part;
  try {
    part = await partsApi.getByNumber(decodeURIComponent(partNumber));
  } catch {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader
        eyebrow={
          <Link href="/manufacturing/parts" className="hover:text-accent transition-colors">
            ← Part Portal
          </Link>
        }
        title={part.partNumber}
        description={part.name}
        actions={
          <div className="flex items-center gap-2">
            <LifecycleBadge value={part.lifecycle} />
            <DeletePartButton id={part.id} partNumber={part.partNumber} />
          </div>
        }
      />

      <PartDetailForm part={part} />
    </div>
  );
}

function LifecycleBadge({ value }: { value: string }) {
  const tone =
    value === 'Released'
      ? 'bg-signal-ok/15 text-signal-ok border-signal-ok/30'
      : value === 'Obsolete'
        ? 'bg-ink-700 text-ink-400 border-ink-600'
        : 'bg-accent/10 text-accent border-accent/30';
  return (
    <span
      className={`inline-flex items-center px-2 h-6 text-[10px] uppercase tracking-widest border rounded-sm ${tone}`}
    >
      {value}
    </span>
  );
}
