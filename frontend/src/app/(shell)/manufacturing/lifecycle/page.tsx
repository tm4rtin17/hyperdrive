import Link from 'next/link';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { partsApi, type PartSummary, PART_TYPE_LABELS } from '@/modules/manufacturing/parts/api';

export const dynamic = 'force-dynamic';

export default async function LifecyclePage() {
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
        title="Lifecycle Management"
        description="Manage bills of materials, revision control, and (soon) engineering change orders and drawings for every part."
      />

      {loadError ? (
        <div className="surface rounded-sm p-4 text-sm text-signal-alert font-mono">{loadError}</div>
      ) : parts.length === 0 ? (
        <div className="surface rounded-sm px-6 py-16 text-center">
          <div className="text-sm text-ink-300">No parts yet.</div>
          <div className="mt-1 text-xs text-ink-400">
            Create parts in the{' '}
            <Link href="/manufacturing/parts" className="text-accent hover:underline">
              Part Portal
            </Link>{' '}
            to manage their lifecycle here.
          </div>
        </div>
      ) : (
        <div className="surface rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-ink-400 bg-ink-800/60">
              <tr>
                <Th>Part Number</Th>
                <Th>Name</Th>
                <Th className="w-32">Type</Th>
                <Th className="w-20">Current Rev</Th>
                <Th className="w-32">Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {parts.map((p) => (
                <tr key={p.id} className="hover:bg-ink-800/40 transition-colors">
                  <Td>
                    <Link
                      href={`/manufacturing/lifecycle/${encodeURIComponent(p.partNumber)}`}
                      className="font-mono text-accent hover:underline"
                    >
                      {p.partNumber}
                    </Link>
                  </Td>
                  <Td className="text-ink-200">{p.name}</Td>
                  <Td className="text-ink-300">{PART_TYPE_LABELS[p.partType] ?? p.partType}</Td>
                  <Td className="font-mono text-ink-100">{p.revision}</Td>
                  <Td>
                    <RevBadge value={p.lifecycle} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-medium px-4 py-2.5 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
function RevBadge({ value }: { value: string }) {
  const tone =
    value === 'Released'
      ? 'bg-signal-ok/15 text-signal-ok border-signal-ok/30'
      : value === 'Obsolete'
        ? 'bg-ink-700 text-ink-400 border-ink-600'
        : 'bg-accent/10 text-accent border-accent/30';
  return (
    <span className={`inline-flex items-center px-2 h-6 text-[10px] uppercase tracking-widest border rounded-sm ${tone}`}>
      {value}
    </span>
  );
}
