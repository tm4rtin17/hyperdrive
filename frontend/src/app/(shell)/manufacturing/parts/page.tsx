import { PageHeader } from '@/shared/components/ui/PageHeader';
import { partsApi, type PartSummary } from '@/modules/manufacturing/parts/api';
import { PartTable } from '@/modules/manufacturing/parts/components/PartTable';
import { CreatePartForm } from '@/modules/manufacturing/parts/components/CreatePartForm';

export const dynamic = 'force-dynamic';

export default async function PartsPage() {
  let parts: PartSummary[] = [];
  let loadError: string | null = null;
  try {
    parts = await partsApi.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'API unreachable.';
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <PageHeader
        eyebrow="Manufacturing"
        title="Part Portal"
        description="Engineering definition of every part. Create parts, assign attributes, and prepare for revision control."
      />

      <div className="space-y-6">
        <CreatePartForm />

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
