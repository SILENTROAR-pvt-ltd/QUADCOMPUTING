import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell/AdminShell';

export const metadata: Metadata = { title: 'Command center · Vibers Connect', robots: { index: false, follow: false } };

/** Every /admin page sits in the command-center frame. The middleware has already checked the super-admin role. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
