'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VaultPhoto } from './vault.constants';

function fromRow(row: any): VaultPhoto {
  const tag: string = row.time_tag || '';
  return {
    id: row.id,
    venue_id: row.venue_id,
    title: row.title,
    category: row.category,
    timeTag: tag,
    time_tag: tag,
    date: tag ? tag.split('@')[0]?.trim() : 'Live Event',
    time: tag ? tag.split('@')[1]?.trim() || '' : '',
    imageUrl: row.image_url,
    image_url: row.image_url,
    description: row.description || '',
    created_at: row.created_at,
  };
}

/**
 * This venue's moments, newest first, kept live: read from the database directly, then through the API when that
 * returns nothing, and re-read whenever the venue changes a photo. A venue with none shows none (never another's).
 */
export function useVenuePhotos(venueId: string) {
  const [photos, setPhotos] = useState<VaultPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (!venueId) { setLoading(false); return; }
    if (manual) setRefreshing(true);
    let found: VaultPhoto[] | null = null;
    try {
      const { data, error } = await createClient().from('venue_photo_vault').select('*').eq('venue_id', venueId).order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) found = data.map(fromRow);
    } catch {
      // Falls through to the API below.
    }
    if (!found) {
      try {
        const res = await fetch(`/api/venue/photo-vault?venue_id=${encodeURIComponent(venueId)}`, { cache: 'no-store' });
        const json = res.ok ? await res.json() : null;
        if (Array.isArray(json?.photos) && json.photos.length > 0) found = json.photos;
      } catch {
        // An empty venue is a legitimate state.
      }
    }
    setPhotos(found ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [venueId]);

  useEffect(() => {
    void load();
    const supabase = createClient();
    const channel = supabase
      .channel(`venue_photo_vault_${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_photo_vault', filter: `venue_id=eq.${venueId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [venueId, load]);

  return { photos, loading, refreshing, refresh: () => load(true) };
}
