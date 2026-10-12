'use client';

import { Shield } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { AdminConsole } from '@/components/club/admin/AdminConsole';

export default function ClubAdminPage() {
  return <ClubShell staff><Screen title="Back office" icon={Shield} width="wide"><AdminConsole /></Screen></ClubShell>;
}
