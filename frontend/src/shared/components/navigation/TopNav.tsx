import Link from 'next/link';
import { NAVIGATION } from '@/shared/config/navigation';
import { ModuleMenu } from './ModuleMenu';

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 h-14 bg-ink-900/95 backdrop-blur border-b hairline">
      <div className="h-full flex items-stretch px-4 gap-1">
        <Link href="/" className="flex items-center gap-2 pr-6 mr-2 border-r hairline">
          <Logo />
          <span className="text-sm font-semibold tracking-wide text-ink-100">HYPERDRIVE</span>
        </Link>

        <nav className="flex items-stretch">
          {NAVIGATION.map((m) => (
            <ModuleMenu key={m.id} module={m} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <SystemPulse />
          <div className="text-xs text-ink-400 font-mono tabular-nums hidden md:block">
            <span className="text-ink-300">ENV</span> dev
          </div>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect x="1" y="1" width="20" height="20" rx="2" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <path d="M5 11 L11 5 L17 11 L11 17 Z" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
    </svg>
  );
}

function SystemPulse() {
  return (
    <div className="flex items-center gap-2 px-3 h-8 surface rounded-sm">
      <span className="relative inline-flex">
        <span className="absolute inset-0 rounded-full bg-signal-ok/40 animate-ping" />
        <span className="relative w-1.5 h-1.5 rounded-full bg-signal-ok" />
      </span>
      <span className="text-[10px] uppercase tracking-widest text-ink-300">Nominal</span>
    </div>
  );
}
