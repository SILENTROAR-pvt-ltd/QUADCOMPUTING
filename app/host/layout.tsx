'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

declare global {
  interface Window {
    __QUAD_WORKSPACE_SYNCED?: boolean;
  }
}

export default function HostHydrationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const profile = useHostWorkspace((state) => state.profile);
  const hydrated = useHostWorkspace((state) => state.hydrated);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    useHostWorkspace.persist.rehydrate();
  }, []);

  useEffect(() => {
    // We want to attempt hydration if the store is fully initialized via persist.
    // If we have a cached profile, we fetch silently in the background to update it.
    // If we don't have a profile, we block rendering until fetched.
    if (hydrated && !isRestoring) {
      setIsRestoring(true);
      
      const restoreWorkspace = async () => {
        try {
          const supabase = createClient();
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            router.push('/auth/host');
            return;
          }

          // Fetch canonical profile
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // If no profile exists, they bypassed onboarding. Send them back.
          if (profileError || !userProfile) {
            router.push('/onboarding/host');
            return;
          }

          // Fetch related business topology
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, gst_number, bank_name, bank_account_number, bank_ifsc_code, upi_id')
            .eq('host_id', userProfile.id);

          const businessMap = new Map(businesses?.map(b => [b.id, b]) || []);
          const businessIds = Array.from(businessMap.keys());
          
          let locations: any[] = [];
          if (businessIds.length > 0) {
            const { data: fetchedLocations } = await supabase
              .from('locations')
              .select('*')
              .in('business_id', businessIds);
            locations = fetchedLocations || [];
          }

          const propertyBranches = locations.map((loc) => {
            const biz = businessMap.get(loc.business_id);
            return {
              id: loc.id as any,
              name: loc.branch_name,
              category: 'cafe' as any, // default
              gstNumber: biz?.gst_number || null,
              bankName: biz?.bank_name || null,
              bankAccountNumber: biz?.bank_account_number || null,
              bankIfscCode: biz?.bank_ifsc_code || null,
              upiId: biz?.upi_id || null,
              address: {
                line1: loc.address,
                line2: null,
                locality: loc.city,
                city: loc.city,
                state: loc.state,
                postalCode: loc.pincode || '',
                country: 'IN' as const,
              },
            geo: null,
            qrCodeHash: loc.qr_code_hash as any,
            status: 'live' as any,
              createdAt: loc.created_at,
              updatedAt: loc.created_at,
            };
          });

          // Fetch catalog items
          let serviceCatalog: any[] = [];
          if (businessIds.length > 0) {
            const { data: catalogData } = await supabase
              .from('catalog_items')
              .select('*')
              .in('business_id', businessIds);
            
            if (catalogData) {
              serviceCatalog = catalogData.map(item => ({
                id: item.id,
                hostId: session.user.id,
                branchId: item.location_id,
                kind: item.item_type === 'room' ? 'accommodation' : 'food_beverage',
                name: item.name,
                description: item.description || '',
                imageUrl: item.image_url || null,
                status: item.is_available ? 'active' : 'sold_out',
                price: { amountMinor: item.price, currency: 'INR' },
                nightlyRate: { amountMinor: item.price, currency: 'INR' },
                capacity: null,
                createdAt: item.created_at,
                updatedAt: item.created_at
              }));
            }
          }

          // Handoff to Zustand Workspace
          useHostWorkspace.getState().adoptSnapshot({
            profile: {
              uniqueOwnerCafeId: userProfile.owner_cafe_id as any,
              displayName: userProfile.full_name,
              legalEntityName: userProfile.full_name,
              avatarUrl: null,
              bannerUrl: null,
              contact: { email: session.user.email || '', phone: userProfile.phone || null },
              dob: userProfile.dob || undefined,
              gender: userProfile.gender || undefined,
              ecosystemStatement: userProfile.ecosystem_statement || '',
              categoriesHandled: userProfile.categories_handled || [],
              offersAccommodation: userProfile.offers_accommodation || false,
              createdAt: userProfile.created_at,
              updatedAt: userProfile.created_at,
            },
            propertyBranches,
            serviceCatalog, 
            revision: userProfile.revision || 0,
          });
        } catch (error) {
          console.error('[Hydration Guard] Workspace restoration failed:', error);
          router.push('/auth/host');
        } finally {
          setIsRestoring(false);
        }
      };

      // Only run once per session load
      if (!window.__QUAD_WORKSPACE_SYNCED) {
        window.__QUAD_WORKSPACE_SYNCED = true;
        restoreWorkspace();
      } else {
        setIsRestoring(false);
      }
    }
  }, [hydrated, isRestoring, router]);

  // While restoring state or waiting for Zustand's initial hydration to complete,
  // we block rendering and show a luxury loading state only if we don't have a cached profile.
  if (!hydrated || (isRestoring && !profile) || (hydrated && !profile && !window.__QUAD_WORKSPACE_SYNCED)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white selection:bg-white selection:text-black">
        <div className="flex flex-col items-center space-y-5">
          <div className="h-6 w-6 animate-spin rounded-full border border-white/20 border-t-white" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            Restoring Secure Workspace...
          </p>
        </div>
      </div>
    );
  }

  // Once fully hydrated and populated, render the secure nested routes
  return <>{children}</>;
}
