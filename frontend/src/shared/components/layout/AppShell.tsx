import { TopNav } from '@/shared/components/navigation/TopNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
