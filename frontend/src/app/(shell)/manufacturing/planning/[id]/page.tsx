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

  return <MasterBuilder master={master} />;
}
