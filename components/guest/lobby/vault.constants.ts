// components/guest/lobby/vault.constants.ts
export interface VaultPhoto {
  id: string;
  venue_id?: string;
  title: string;
  category: string;
  date?: string;
  time?: string;
  timeTag?: string;
  time_tag?: string;
  description: string;
  imageUrl: string;
  image_url?: string;
  created_at?: string;
}

export const VENUE_VAULT_PHOTOS: VaultPhoto[] = [];
