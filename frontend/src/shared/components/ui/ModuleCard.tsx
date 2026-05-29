import Link from 'next/link';
import type { ModuleDefinition } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/cn';

const accentBar: Record<ModuleDefinition['accent'], string> = {
  amber:  'bg-accent',
  cyan:   'bg-cyan-400',
  violet: 'bg-violet-400',
  teal:   'bg-teal-400',
};

export function ModuleCard({ module }: { module: ModuleDefinition }) {
  return (
    <article className="surface rounded-sm overflow-hidden flex flex-col">
      <div className={cn('h-0.5 w-full', accentBar[module.accent])} />
      <header className="px-5 pt-5 pb-3">
        <div className="text-[10px] uppercase tracking-widest text-ink-400">Module</div>
        <h2 className="mt-1 text-xl font-semibold text-ink-100">{module.label}</h2>
        <p className="mt-1 text-sm text-ink-300">{module.purpose}</p>
      </header>
      <ul className="border-t hairline divide-y divide-ink-700/60">
        {module.submodules.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className="block px-5 py-4 hover:bg-ink-800/60 active:bg-ink-700/60 transition-colors min-h-[64px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-100">{s.label}</span>
                <Arrow />
              </div>
              <div className="mt-0.5 text-xs text-ink-400">{s.blurb}</div>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="text-ink-400">
      <path d="M3 7h7m-3-3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
