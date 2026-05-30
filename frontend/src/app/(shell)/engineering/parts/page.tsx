import Link from 'next/link';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { partsApi, type PartSummary } from '@/modules/engineering/parts/api';
import { PartTable } from '@/modules/engineering/parts/components/PartTable';
import { CreatePartForm } from '@/modules/engineering/parts/components/CreatePartForm';

export const dynamic = 'force-dynamic';

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const includeArchived = archived === '1';

  let parts: PartSummary[] = [];
  let loadError: string | null = null;
  try {
    parts = await partsApi.list({ includeArchived });
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'API unreachable.';
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <PageHeader
        eyebrow="Manufacturing"
        title="Part Portal"
        description="Engineering definition of every part. Create parts, set the part-master attributes, and prepare for revision control."
      />

      <div className="space-y-6">
        <CreatePartForm />

        <div className="flex items-center justify-end">
          <Link
            href={includeArchived ? '/engineering/parts' : '/engineering/parts?archived=1'}
            className="text-xs uppercase tracking-wider text-ink-400 hover:text-accent transition-colors"
          >
            {includeArchived ? '✓ Showing archived' : 'Show archived'}
          </Link>
        </div>

        {loadError ? (
          <div className="surface rounded-sm p-4 text-sm text-signal-alert font-mono">
            {loadError}
          </div>
        ) : (
          <PartTable parts={parts} />
        )}
      </div>
    </div>
  );
}
