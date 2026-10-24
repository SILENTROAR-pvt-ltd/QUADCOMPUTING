import { redirect } from 'next/navigation';

/** The payment desk now lives in the command center under Payments. Old links land there. */
export default function TopupDeskRedirect() {
  redirect('/admin/payments');
}
