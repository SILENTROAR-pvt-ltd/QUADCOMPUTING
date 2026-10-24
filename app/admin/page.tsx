import { DashboardPage } from '@/components/admin/overview/DashboardPage';

/** /admin: the command-center dashboard. The middleware has already checked the super-admin role. */
export default function AdminHome() {
  return <DashboardPage />;
}
