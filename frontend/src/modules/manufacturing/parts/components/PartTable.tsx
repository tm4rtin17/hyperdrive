'use client';

import type { PartSummary } from '@/modules/manufacturing/parts/api';

export function PartTable({ parts }: { parts: PartSummary[] }) {
  if (parts.length === 0) {
    return (
      <div className="surface rounded-sm px-6 py-16 text-center">
        <div className="text-sm text-ink-300">No parts yet.</div>
        <div className="mt-1 text-xs text-ink-400">Create the first part to seed the engineering catalog.</div>
      </div>
    );
  }

  return (
    <div className="surface rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-widest text-ink-400 bg-ink-800/60">
          <tr>
            <Th>Part Number</Th>
            <Th>Name</Th>
            <Th className="w-20">Rev</Th>
            <Th className="w-32">Lifecycle</Th>
            <Th className="w-44 text-right">Created</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700/60">
          {parts.map((p) => (
            <tr key={p.id} className="hover:bg-ink-800/40 transition-colors">
              <Td className="font-mono text-ink-100">{p.partNumber}</Td>
              <Td className="text-ink-200">{p.name}</Td>
              <Td className="font-mono text-ink-300">{p.revision}</Td>
              <Td><LifecycleBadge value={p.lifecycle} /></Td>
              <Td className="text-right font-mono tabular-nums text-ink-400">
                {new Date(p.createdAt).toLocaleString()}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-medium px-4 py-2.5 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function LifecycleBadge({ value }: { value: string }) {
  const tone =
    value === 'Released' ? 'bg-signal-ok/15 text-signal-ok border-signal-ok/30' :
    value === 'Obsolete' ? 'bg-ink-700 text-ink-400 border-ink-600' :
    'bg-accent/10 text-accent border-accent/30';
  return (
    <span className={`inline-flex items-center px-2 h-6 text-[10px] uppercase tracking-widest border rounded-sm ${tone}`}>
      {value}
    </span>
  );
}
