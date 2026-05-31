import Link from 'next/link';
import { mastersApi, type EngineeringMasterSummary } from '@/modules/manufacturing/planning/api';
import { CreateMasterButton } from '@/modules/manufacturing/planning/components/CreateMasterButton';

export const dynamic = 'force-dynamic';

export default async function PlanningPage() {
  let masters: EngineeringMasterSummary[] = [];
  let loadError: string | null = null;
  try {
    masters = await mastersApi.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'API unreachable.';
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 pb-6 mb-6 border-b hairline">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-400">Manufacturing</div>
          <h1 className="mt-1 text-2xl font-semibold text-ink-100">Manufacturing Planning</h1>
          <p className="mt-1 text-sm text-ink-300 max-w-2xl">
            Define an engineering master for each part — its embedded op sequence and build
            instructions — then generate work orders from it.
          </p>
        </div>
        <CreateMasterButton />
      </div>

      {loadError ? (
        <div className="surface rounded-sm p-4 text-sm text-signal-alert font-mono">{loadError}</div>
      ) : masters.length === 0 ? (
        <div className="surface rounded-sm px-6 py-16 text-center">
          <div className="text-sm text-ink-300">No engineering masters yet.</div>
          <div className="mt-1 text-xs text-ink-400">
            Click <span className="text-accent">Create Engineering Master</span> to define the build
            for a part.
          </div>
        </div>
      ) : (
        <div className="surface rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-ink-400 bg-ink-800/60">
              <tr>
                <Th>Part Number</Th>
                <Th>Part Name</Th>
                <Th className="w-24">Operations</Th>
                <Th className="w-28">Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {masters.map((m) => (
                <tr key={m.id} className="hover:bg-ink-800/40 transition-colors">
                  <Td>
                    <Link
                      href={`/manufacturing/planning/${m.id}`}
                      className="font-mono text-accent hover:underline"
                    >
                      {m.partNumber}
                    </Link>
                  </Td>
                  <Td className="text-ink-200">{m.partName ?? <span className="text-ink-500">— unlinked —</span>}</Td>
                  <Td className="font-mono tabular-nums text-ink-100">{m.operationCount}</Td>
                  <Td>
                    <StatusBadge value={m.status} />
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
function StatusBadge({ value }: { value: string }) {
  const tone =
    value === 'Released'
      ? 'bg-signal-ok/15 text-signal-ok border-signal-ok/30'
      : 'bg-accent/10 text-accent border-accent/30';
  return (
    <span className={`inline-flex items-center px-2 h-6 text-[10px] uppercase tracking-widest border rounded-sm ${tone}`}>
      {value}
    </span>
  );
}
