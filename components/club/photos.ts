// Travel photography for Vibers Club (Unsplash CDN, which permits hotlinking). Every id below was
// checked to load; place names are given only for landmarks that are recognisable in the photo.
// A plan or listing always shows its own uploaded photos first; these are the backdrop and fallback.

export interface Photo { id: string; place?: string; country?: string }

/** A sized, cropped, compressed URL for one photo. */
export const photoUrl = (id: string, width = 1200, height?: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}${height ? `&h=${height}` : ''}&q=75`;

export const DESTINATIONS = {
  taj: { id: '1564507592333-c60657eea523', place: 'Taj Mahal, Agra', country: 'India' },
  ladakh: { id: '1581793745862-99fde7fa73d2', place: 'Ladakh', country: 'India' },
  kerala: { id: '1593693397690-362cb9666fc2', place: 'Kerala backwaters', country: 'India' },
  jaipur: { id: '1477587458883-47145ed94245', place: 'Hawa Mahal, Jaipur', country: 'India' },
  mumbai: { id: '1570168007204-dfb528c6958f', place: 'Gateway of India, Mumbai', country: 'India' },
  halong: { id: '1528127269322-539801943592', place: 'Ha Long Bay', country: 'Vietnam' },
  bali: { id: '1537996194471-e657df975ab4', place: 'Ulun Danu, Bali', country: 'Indonesia' },
  thailand: { id: '1552465011-b4e21bf6e79a', place: 'Thai islands', country: 'Thailand' },
  santorini: { id: '1533105079780-92b9be482077', place: 'Santorini', country: 'Greece' },
  venice: { id: '1523906834658-6e24ef2386f9', place: 'Venice', country: 'Italy' },
  paris: { id: '1502602898657-3e91760cbb34', place: 'Paris', country: 'France' },
  moraine: { id: '1493246507139-91e8fad9978e', place: 'Moraine Lake', country: 'Canada' },
  sanfrancisco: { id: '1501594907352-04cda38ebc29', place: 'Golden Gate, San Francisco', country: 'USA' },
  safari: { id: '1523805009345-7448845a9e53', place: 'On safari', country: 'Africa' },
  morocco: { id: '1489749798305-4fea3ae63d43', place: 'Desert kasbahs', country: 'Morocco' },
  sydney: { id: '1506973035872-a4ec16b8e8d9', place: 'Sydney Harbour', country: 'Australia' },
  wanaka: { id: '1494500764479-0c8f2919a3d8', place: 'Lake Wanaka', country: 'New Zealand' },
  cappadocia: { id: '1530789253388-582c481c54b0', place: 'Cappadocia', country: 'Türkiye' },
} satisfies Record<string, Photo>;

/** One photo per Common Room region (the region rail and post backdrops). */
export const REGION_PHOTO: Record<string, Photo> = {
  india: DESTINATIONS.ladakh, asia: DESTINATIONS.halong, europe: DESTINATIONS.santorini,
  americas: DESTINATIONS.moraine, africa: DESTINATIONS.safari, oceania: DESTINATIONS.sydney,
};

/** The landing and sign-in slideshow, in order. */
export const SLIDESHOW: Photo[] = [
  DESTINATIONS.ladakh, DESTINATIONS.santorini, DESTINATIONS.kerala, DESTINATIONS.cappadocia,
  DESTINATIONS.taj, DESTINATIONS.bali, DESTINATIONS.moraine, DESTINATIONS.thailand,
];

/** Mood photos (no place claimed) by kind of plan, used when a plan has no photo of its own. */
const MOOD: Record<string, string[]> = {
  tour: ['1506905925346-21bda4d32df4', '1476514525535-07fb3b4ae5f1', '1464822759023-fed622ff2c3b', '1503220317375-aaad61436b1b', '1500530855697-b586d89ba3ee', '1504280390367-361c6d9f38f4', '1508672019048-805c876b67e2'],
  event: ['1529156069898-49953e39b3ac', '1517457373958-b7bdd4587205', '1514525253161-7a46d19cd819', '1539635278303-d4002c07eae3'],
  short_plan: ['1495474472287-4d71bcdd2085', '1414235077428-338989a2e8c0', '1517248135467-4c7edcad34c4'],
  stay: ['1566073771259-6a8506099945', '1520250497591-112f2f40a3f4', '1582719478250-c89cae4dc85b', '1571896349842-33c89424de2d', '1551882547-ff40c63fe5fa'],
};

/** The same mood photo for the same plan every time (a stable pick from its id). */
export function moodPhoto(kind: string, key: string, width = 900) {
  const list = MOOD[kind] ?? MOOD.tour;
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return photoUrl(list[hash % list.length], width);
}

/** One photo per Explore type (trips, events and each kind of meetup), for the square tiles. All checked to load. */
const TYPE_PHOTO: Record<string, string> = {
  trip: '1506905925346-21bda4d32df4', event: '1529156069898-49953e39b3ac', coffee: '1509042239860-f550ce710b93',
  food: '1603088549155-6ae9395b928f', walk: '1534413372955-69ca0c082191', party: '1517457373958-b7bdd4587205',
  music: '1533174072545-7a4b6ad7a6c3', sports: '1579952363873-27f3bade9f55', dev: '1484788984921-03950022c9ef',
  creative: '1459908676235-d5f02a50184b', wellness: '1544367567-0f2fcb009e0b', together: '1562050344-f7ad946cee35',
};

/** A small square crop of a type's photo. */
export const typePhoto = (key: string, size = 300) => photoUrl(TYPE_PHOTO[key] ?? TYPE_PHOTO.together, size, size);

/** Banner photos for travel profiles, picked by member. */
export const PROFILE_BANNERS = [DESTINATIONS.wanaka.id, DESTINATIONS.moraine.id, DESTINATIONS.kerala.id, DESTINATIONS.santorini.id, '1501785888041-af3ef285b470'];
