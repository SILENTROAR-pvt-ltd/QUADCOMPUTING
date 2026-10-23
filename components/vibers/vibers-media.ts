// The film and photography on the Vibers Connect page (public/media/vibers; cut by scripts/vibers/encode-landing-media.ps1).
// Names carry a version (-v1), so a changed file gets a new name and the year-long cache on /media stays safe.
// Plain data, so server sections can read it.

const M = '/media/vibers';

export interface HeroClip { id: string; caption: string; seconds: number; desktop: string; desktopPoster: string; phone: string; phonePoster: string }

const clip = (id: string, caption: string, seconds: number): HeroClip => ({
  id, caption, seconds,
  desktop: `${M}/hero-${id}-d-v1.mp4`, desktopPoster: `${M}/hero-${id}-d-v1.webp`,
  phone: `${M}/hero-${id}-m-v1.mp4`, phonePoster: `${M}/hero-${id}-m-v1.webp`,
});

/** The opening film, in order: the yacht first, then the people, the heights and the nights. */
export const HERO_CLIPS: HeroClip[] = [
  clip('yacht', 'Arrive in your own rhythm', 6.2),
  clip('tribe', 'Find your people', 4.8),
  clip('summit', 'Go a little higher', 4.8),
  clip('nights', 'Nights that stay with you', 4.8),
];

/**
 * The phone frame beside "Who is a Viber": four 3-second portrait moments (540x960) that dissolve into one another: a
 * slow-motion dance on a sunset beach, a smile in the hills, two friends laughing in traditional dress, a winter fire.
 */
const moment = (id: string) => ({ id, src: `${M}/moment-${id}-v1.mp4`, poster: `${M}/moment-${id}-v1.webp` });
export const MOMENT_CLIPS = [moment('dance'), moment('smile'), moment('culture'), moment('fireside')];

const photo = (name: string, width: number, height: number, alt: string) => ({ src: `${M}/photo-${name}-v1.webp`, width, height, alt });

// Photography from Pexels (free to use). No venue is claimed for any of them.
export const PHOTOS = {
  viber: photo('viber-sunset', 1400, 934, 'A traveller with open arms on a hilltop at sunset'),
  lounge: photo('lounge', 1100, 1650, 'A warm, elegant lounge with deep chairs and soft light'),
  walk: photo('walk', 1200, 676, 'A group walking a golden mountain ridge'),
  movie: photo('movie', 1200, 800, 'Friends on blankets at a rooftop movie night under string lights'),
  music: photo('music', 1200, 676, 'Friends with a guitar, laughing by a tent at night'),
  bonfire: photo('bonfire', 1200, 676, 'Friends talking around a beach bonfire at dusk'),
  stay: photo('stay-pool', 1600, 1068, 'An infinity pool looking over misty hills at dusk'),
  // Vibers Club, and the three steps of creating your own plan.
  clubRooftop: photo('club-rooftop', 860, 1146, 'Friends on a rooftop at golden hour, laughing at something on a phone'),
  clubDinner: photo('club-dinner', 860, 1074, 'Friends raising glasses across a candle-lit dinner table'),
  planEvents: photo('plan-events', 1600, 900, 'Friends dancing and raising drinks at a rooftop party at sunset'),
  planJourney: photo('plan-journey', 1600, 1067, 'A group standing on top of a camper van, arms up, at sunrise in the hills'),
  planCelebrate: photo('plan-celebrate', 1600, 900, 'Friends in silhouette with sparklers against a pink and orange sunset by the water'),
  clouds: photo('above-clouds', 1800, 1350, 'A person with arms open above a sea of clouds'),
  courtyard: photo('courtyard', 900, 1125, 'A courtyard glowing with string lights at night, tables set for guests'),
  together: photo('together', 900, 1125, 'Friends silhouetted with raised hands against a sunset'),
  spaPhone: photo('spa-phone', 900, 1125, 'A guest in a white robe checking her phone beside a spa pool'),
  // When the vibe breaks, and the ecosystem deck.
  crowd: photo('crowd', 1200, 1800, 'A young woman standing still on a bridge while a blurred crowd hurries past her'),
  meet: photo('meet', 1100, 619, 'Four friends laughing over coffee, leaning in to look at one phone'),
  peace: photo('peace', 1100, 733, 'A woman sitting alone on a hilltop, facing a warm mountain sunrise'),
  // Experiences at Vibers Connect points.
  archery: photo('archery', 720, 960, 'An archer drawing a bow on a grassy hillside, green valleys behind him'),
  jungle: photo('jungle', 720, 960, 'Walkers pausing among giant ferns in a misty, deep green forest'),
  horse: photo('horse', 1000, 693, 'Two riders galloping along the shoreline against an orange sunset'),
  run: photo('run', 760, 1014, 'Two runners on a wide beach at sunrise, long shadows on the sand'),
  coffee: photo('coffee', 1000, 667, 'Friends around a small round table, hands reaching for cups of coffee'),
  startup: photo('startup', 760, 1090, 'A meetup host, seen from behind, looking over a busy co-working room'),
  tech: photo('tech', 760, 1048, 'A stage washed in blue light before a full audience at a tech evening'),
  // Rave parties, from beaches to the Himalayas (the festival photo was provided for the page; its logo is cropped out).
  rave: photo('rave', 960, 512, 'Dancers barefoot under bright psychedelic canopies at an open-air mountain festival'),
  raveBeach: photo('rave-beach', 1000, 831, 'A fire dancer spinning flames for a crowd on a beach at dusk'),
  raveHills: photo('rave-hills', 1000, 667, 'A campfire glowing under the Milky Way in the Himalayan hills'),
} as const;
