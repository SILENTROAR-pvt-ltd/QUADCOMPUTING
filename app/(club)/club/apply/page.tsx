import { ApplyFlow } from '@/components/club/apply/ApplyFlow';
import { Gate } from '@/components/club/nav/Gate';

export const metadata = { title: 'Apply · Vibers Club' };

export default function ApplyPage() {
  return <Gate><ApplyFlow /></Gate>;
}
