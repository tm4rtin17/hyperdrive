import { AppShell } from '@/shared/components/layout/AppShell';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
