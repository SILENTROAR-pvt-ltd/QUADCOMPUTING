import { Suspense } from 'react';
import { VenuesPage } from '@/components/admin/venues/VenuesPage';

/** /admin/venues: the venue directory, plans and reviews. */
export default function AdminVenues() {
  return <Suspense fallback={null}><VenuesPage /></Suspense>;
}
