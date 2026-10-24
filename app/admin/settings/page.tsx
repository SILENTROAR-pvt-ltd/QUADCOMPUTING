import { PasswordCard } from '@/components/admin/settings/PasswordCard';
import { SessionCard } from '@/components/admin/settings/SessionCard';
import { AdminLogPanel } from '@/components/admin/settings/AdminLogPanel';

/** /admin/settings: the super admin's password, session and the log of every admin action. */
export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PasswordCard />
      <SessionCard />
      <AdminLogPanel />
    </div>
  );
}
