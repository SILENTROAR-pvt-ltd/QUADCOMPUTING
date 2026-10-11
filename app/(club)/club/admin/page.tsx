'use client';

import { ClubShell } from '@/components/club/ClubShell';
import { AdminConsole } from '@/components/club/admin/AdminConsole';

export default function ClubAdminPage() {
  return <ClubShell staff><AdminConsole /></ClubShell>;
}
