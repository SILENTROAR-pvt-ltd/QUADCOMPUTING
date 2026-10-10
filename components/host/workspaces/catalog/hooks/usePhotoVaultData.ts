import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/utils/api-client';
import type { VaultPhoto } from '@/components/guest/lobby/vault.constants';

export function usePhotoVaultData(venueId: string, isOpen: boolean, onUpdated?: () => void) {
  const [photos, setPhotos] = useState<VaultPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchVaultPhotos = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('venue_photo_vault')
          .select('*')
          .eq('venue_id', venueId)
          // Dish photos are menu material, shown in the dish picker, not as event moments.
          .neq('category', 'Dish photos')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: VaultPhoto[] = data.map((r: any) => ({
            id: r.id,
            venue_id: r.venue_id,
            title: r.title,
            category: r.category,
            timeTag: r.time_tag || '',
            time_tag: r.time_tag || '',
            date: r.time_tag ? r.time_tag.split('@')[0]?.trim() : 'Live Event',
            time: r.time_tag ? r.time_tag.split('@')[1]?.trim() || '' : '',
            imageUrl: r.image_url,
            image_url: r.image_url,
            description: r.description || '',
            created_at: r.created_at,
          }));
          setPhotos(mapped);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[usePhotoVaultData] Supabase note:', err);
    }

    try {
      const res = await fetch(`/api/venue/photo-vault?venue_id=${encodeURIComponent(venueId)}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.photos)) {
          setPhotos(json.photos);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('[usePhotoVaultData] API note:', apiErr);
    }

    setPhotos([]);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [venueId]);

  useEffect(() => {
    if (isOpen) fetchVaultPhotos();
  }, [isOpen, fetchVaultPhotos]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the Photo Vault?`)) return;
    setDeletingId(id);
    setDeleteError(null);
    // The API is the only writer: it is scoped to this venue. Only drop the photo from the UI
    // once the server confirms it is gone.
    const result = await apiRequest(`/api/venue/photo-vault?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setDeletingId(null);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (onUpdated) onUpdated();
  };
  return { photos, isLoading, isRefreshing, deletingId, deleteError, fetchVaultPhotos, handleDelete };
}
