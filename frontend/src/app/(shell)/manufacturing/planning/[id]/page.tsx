import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mastersApi, type EngineeringMaster } from '@/modules/manufacturing/planning/api';
import { MasterBuilder } from '@/modules/manufacturing/planning/components/MasterBuilder';

export const dynamic = 'force-dynamic';

export default async function MasterBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let master: EngineeringMaster;
  try {
    master = await mastersApi.get(id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="pb-5 mb-6 border-b hairline">
        <div className="text-[10px] uppercase tracking-widest text-ink-400 mb-1">
          <Link href="/manufacturing/planning" className="hover:text-accent transition-colors">
            ← Manufacturing Planning
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink-100">{master.partNumber}</h1>
            <p className="mt-0.5 text-sm text-ink-300">
              {master.partName ? (
                <>Engineering master · {master.partName}</>
              ) : (
                <>Engineering master · <span className="text-ink-500">unlinked part</span></>
              )}
            </p>
          </div>
          <span className="inline-flex items-center px-2 h-6 text-[10px] uppercase tracking-widest border rounded-sm bg-accent/10 text-accent border-accent/30">
            {master.status}
          </span>
        </div>
      </div>

      <MasterBuilder master={master} />
    </div>
  );
}
