'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ModuleDefinition } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/cn';

type Props = { module: ModuleDefinition };

export function ModuleMenu({ module }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  const isActive = pathname?.startsWith(`/${module.id}`) ?? false;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'h-11 px-4 inline-flex items-center gap-2 text-sm font-medium',
          'border-b-2 transition-colors',
          isActive ? 'border-accent text-ink-100' : 'border-transparent text-ink-300 hover:text-ink-100',
        )}
      >
        {module.label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={cn('transition-transform', open && 'rotate-180')}
          aria-hidden
        >
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-80 surface-raised rounded-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b hairline">
            <div className="text-[10px] uppercase tracking-widest text-ink-400">Module</div>
            <div className="text-sm text-ink-100">{module.label}</div>
            <div className="mt-1 text-xs text-ink-300">{module.purpose}</div>
          </div>
          <ul>
            {module.submodules.map((s) => {
              const active = pathname === s.href;
              return (
                <li key={s.id}>
                  <Link
                    href={s.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block px-4 py-3 border-b hairline last:border-b-0',
                      'hover:bg-ink-700/60 transition-colors',
                      active && 'bg-ink-700/40',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-100">{s.label}</span>
                      {active && <span className="text-[10px] text-accent uppercase tracking-widest">Open</span>}
                    </div>
                    <div className="text-xs text-ink-400 mt-0.5">{s.blurb}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
