import { NAVIGATION } from '@/shared/config/navigation';
import { ModuleCard } from '@/shared/components/ui/ModuleCard';

export default function HomePage() {
  return (
    <div className="relative">
      <BackdropGrid />

      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="text-[10px] uppercase tracking-[0.3em] text-accent">Hyperdrive · v0.1</div>
        <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-ink-100">
          Manufacturing infrastructure for high-velocity hardware.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-ink-300">
          Engineering definition, planning, and shop-floor execution in one operator-focused
          platform. Built for iteration, traceability, and the floor — not the boardroom.
        </p>

        <div className="mt-8 flex items-center gap-3 text-xs font-mono tabular-nums text-ink-400">
          <SystemTag label="API" value="online" tone="ok" />
          <SystemTag label="DB" value="connected" tone="ok" />
          <SystemTag label="MODULES" value={String(NAVIGATION.length)} />
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] uppercase tracking-widest text-ink-400">Modules</h2>
          <span className="text-[10px] uppercase tracking-widest text-ink-500">
            Tap to enter
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {NAVIGATION.map((m) => (
            <ModuleCard key={m.id} module={m} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SystemTag({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'alert';
}) {
  const dot =
    tone === 'ok' ? 'bg-signal-ok' :
    tone === 'warn' ? 'bg-signal-warn' :
    tone === 'alert' ? 'bg-signal-alert' :
    'bg-ink-500';
  return (
    <span className="inline-flex items-center gap-2 px-2.5 h-7 surface rounded-sm">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-ink-300">{label}</span>
      <span className="text-ink-100">{value}</span>
    </span>
  );
}

function BackdropGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse at top, black 30%, transparent 70%)',
      }}
    />
  );
}
