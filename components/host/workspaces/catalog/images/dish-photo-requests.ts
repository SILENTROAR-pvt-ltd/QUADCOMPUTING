import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

/** Puts a photo from a web address on a dish. The server downloads it and keeps its own copy. */
export function setDishPhotoFromUrl(itemId: string, url: string) {
  return apiRequest<{ image_url?: string }>('/api/host/catalog/images/from-url', jsonRequest('POST', { item_id: itemId, url }));
}
