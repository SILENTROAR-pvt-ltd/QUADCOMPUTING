// What happens at a Vibers Connect point: the experiences rail under "Venues with soul". Plain data, so server
// sections can read it. The order mixes the vibes, so the unfiltered rail never shows four of a kind in a row.
import { PHOTOS } from './vibers-media';

export type Vibe = 'Outdoors' | 'Social' | 'Founders' | 'Nights';
export const VIBES: Vibe[] = ['Outdoors', 'Social', 'Founders', 'Nights'];

type Photo = (typeof PHOTOS)[keyof typeof PHOTOS];
export interface Experience { photo: Photo; title: string; note: string; time: string; vibe: Vibe }

export const EXPERIENCES: Experience[] = [
  { photo: PHOTOS.archery, title: 'Archery camp', note: 'in Kharma Valley', time: 'Mornings', vibe: 'Outdoors' },
  { photo: PHOTOS.coffee, title: 'Coffee meets', note: 'strangers at the first cup, friends by the second', time: 'Any time', vibe: 'Social' },
  { photo: PHOTOS.horse, title: 'Beachside horse riding', note: 'along the shore at golden hour', time: 'Golden hour', vibe: 'Outdoors' },
  { photo: PHOTOS.startup, title: 'Startup meets', note: 'founders, builders and the curious', time: 'Afternoons', vibe: 'Founders' },
  { photo: PHOTOS.jungle, title: 'Deep jungle walks', note: 'into the green, with a local guide', time: 'Early mornings', vibe: 'Outdoors' },
  { photo: PHOTOS.music, title: 'Music nights', note: 'community games and party culture', time: 'Nights', vibe: 'Nights' },
  { photo: PHOTOS.run, title: 'Sunrise beach runs', note: 'or a slow walk, at your pace', time: 'Sunrise', vibe: 'Outdoors' },
  { photo: PHOTOS.tech, title: 'Tech nights', note: 'talks, demos and the after-talk', time: 'Evenings', vibe: 'Founders' },
  { photo: PHOTOS.movie, title: 'Movie nights', note: 'and get-togethers on the rooftop', time: 'Late evenings', vibe: 'Social' },
  { photo: PHOTOS.bonfire, title: 'Storytelling', note: 'around a bonfire or in a cosy corner', time: 'Late nights', vibe: 'Nights' },
  { photo: PHOTOS.walk, title: 'Group walk-arounds', note: 'and Viber events', time: 'Mornings', vibe: 'Social' },
];

/** The words for the slow ticker at the foot of the section. */
export const TICKER = ['Rave parties', 'Archery camps', 'Jungle walks', 'Beach rides', 'Sunrise runs', 'Coffee meets', 'Startup meets', 'Tech nights', 'Bonfire stories'];
