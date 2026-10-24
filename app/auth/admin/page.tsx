import type { Metadata } from 'next';
import { AdminSignIn } from '@/components/admin/auth/AdminSignIn';
import { safeAdminNext } from '@/components/admin/auth/admin-next';

export const metadata: Metadata = { title: 'Super admin · Vibers', robots: { index: false, follow: false } };

/** /auth/admin: the super-admin sign-in, separate from the venue login (/auth/host). */
export default async function AdminAuthPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AdminSignIn next={safeAdminNext(next)} />;
}
