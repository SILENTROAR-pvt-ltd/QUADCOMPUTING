'use client';

import { useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { GalleryPhoto } from '@/lib/services/menu-info/gallery';
import { shrinkPhoto } from './shrink-photo';

type Message = { kind: 'ok' | 'err'; text: string } | null;
const same = (a: GalleryPhoto[], b: GalleryPhoto[]) => a.length === b.length && a.every((p, i) => p.url === b[i].url && p.caption === b[i].caption);

/** The memory vault for the host: load, add (one photo at a time, shrunk first), caption, reorder, remove, save. */
export function useGalleryVault() {
  const [saved, setSaved] = useState<GalleryPhoto[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const apply = (gallery: GalleryPhoto[]) => { setSaved(gallery); setPhotos(gallery); };

  useEffect(() => {
    apiRequest<any>('/api/host/menu-info', { cache: 'no-store' }).then((res) => {
      if (res.ok) apply(res.data?.info?.gallery ?? []);
      else setMessage({ kind: 'err', text: res.error || 'Could not load your memory vault.' });
      setLoading(false);
    });
  }, []);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage(null);
    const list = Array.from(files);
    for (let i = 0; i < list.length; i += 1) {
      const file = list[i];
      setBusy(`Adding photo ${i + 1} of ${list.length}…`);
      const shrunk = await shrinkPhoto(file);
      if (!shrunk) { setMessage({ kind: 'err', text: `${file.name} could not be read as a photo.` }); continue; }
      const res = await apiRequest<any>('/api/host/menu-info/gallery', jsonRequest('POST', shrunk));
      if (!res.ok) { setMessage({ kind: 'err', text: res.error || 'A photo could not be added.' }); break; }
      // Keep captions typed but not yet saved for the photos already there.
      const added: GalleryPhoto[] = res.data?.info?.gallery ?? [];
      setSaved(added);
      setPhotos((cur) => added.map((p) => cur.find((c) => c.url === p.url) ?? p));
    }
    setBusy(null);
  };

  const remove = async (url: string) => {
    setBusy('Removing…');
    setMessage(null);
    const res = await apiRequest<any>('/api/host/menu-info/gallery', jsonRequest('DELETE', { url }));
    setBusy(null);
    if (!res.ok) return setMessage({ kind: 'err', text: res.error || 'Could not remove the photo.' });
    setSaved(res.data?.info?.gallery ?? []);
    setPhotos((cur) => cur.filter((p) => p.url !== url));
  };

  const caption = (url: string, text: string) => setPhotos((cur) => cur.map((p) => (p.url === url ? { ...p, caption: text } : p)));
  const move = (i: number, dir: -1 | 1) => setPhotos((cur) => {
    const j = i + dir;
    if (j < 0 || j >= cur.length) return cur;
    const next = [...cur];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const save = async () => {
    setBusy('Saving…');
    setMessage(null);
    const res = await apiRequest<any>('/api/host/menu-info', jsonRequest('PUT', { info: { gallery: photos } }));
    setBusy(null);
    if (!res.ok) return setMessage({ kind: 'err', text: res.error || 'Could not save. Please try again.' });
    apply(res.data?.info?.gallery ?? photos);
    setMessage({ kind: 'ok', text: 'Saved. Guests see these at the foot of the menu.' });
  };

  return { photos, loading, busy, message, dirty: !same(photos, saved), add, remove, caption, move, save };
}
