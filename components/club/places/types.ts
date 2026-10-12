// Shapes the places API returns, and the labels for each kind of place.
export interface PlaceStats { stories: number; posts: number; planning: number }

export interface Place {
  id: string;
  slug: string;
  name: string;
  region: string;
  country: string;
  kinds: string[];
  blurb: string | null;
  cover: string | null;
  stats: PlaceStats;
  planning: boolean;
  trend: number;
}

/** A place as a story or post refers to it. */
export interface PlaceRef { id: string; name: string; region?: string; country?: string }

export const KIND_LABEL: Record<string, string> = {
  beach: 'Beaches', mountains: 'Mountains', city: 'Cities', heritage: 'Heritage', food: 'Food',
  nightlife: 'Nightlife', nature: 'Nature', adventure: 'Adventure', spiritual: 'Spiritual',
};

export const KIND_KEYS = Object.keys(KIND_LABEL);
