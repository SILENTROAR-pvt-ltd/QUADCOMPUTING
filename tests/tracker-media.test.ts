import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TRACKER_MEDIA } from '@/components/guest/menu/tracker/tracker-copy';
import { JOURNEY_STICKERS } from '@/components/guest/menu/journey-media';

// The tracker clips are downloaded by guests on mobile data. This keeps a heavy file from ever being shipped by accident:
// the original clips were 7 to 53 MB each, the web versions must stay a small fraction of that.
const KB = 1024;
const BUDGET: Record<string, { video: number; poster: number }> = {
  banner: { video: 700 * KB, poster: 30 * KB },
  preparing: { video: 450 * KB, poster: 20 * KB },
  ready: { video: 300 * KB, poster: 20 * KB },
};

describe('tracker media', () => {
  for (const [name, media] of Object.entries(TRACKER_MEDIA)) {
    it(`${name}: both files exist and stay inside the size budget`, () => {
      const video = join(process.cwd(), 'public', media.src);
      const poster = join(process.cwd(), 'public', media.poster);
      expect(existsSync(video), video).toBe(true);
      expect(existsSync(poster), poster).toBe(true);
      expect(statSync(video).size).toBeLessThan(BUDGET[name].video);
      expect(statSync(poster).size).toBeLessThan(BUDGET[name].poster);
    });
  }

  it('the whole set a guest can be sent is under 1.2 MB', () => {
    const total = Object.values(TRACKER_MEDIA).reduce(
      (sum, m) => sum + statSync(join(process.cwd(), 'public', m.src)).size + statSync(join(process.cwd(), 'public', m.poster)).size,
      0
    );
    expect(total).toBeLessThan(1.2 * 1024 * KB);
  });
});

describe('journey stickers', () => {
  it('are small transparent files that exist, three of them, each under 25 KB', () => {
    expect(JOURNEY_STICKERS).toHaveLength(3);
    for (const src of JOURNEY_STICKERS) {
      expect(src).toMatch(/^\/media\/stickers\/[a-z-]+-v\d+\.webp$/);
      const file = join(process.cwd(), 'public', src);
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size).toBeLessThan(25 * KB);
    }
  });
});

describe('thank-you sticker', () => {
  it('exists and stays under 150 KB (the GIF it came from was 556 KB)', () => {
    const file = join(process.cwd(), 'public', 'media', 'stickers', 'thank-you-v1.webp');
    expect(existsSync(file), file).toBe(true);
    expect(statSync(file).size).toBeLessThan(150 * KB);
  });
});

describe('lounge photographs', () => {
  it('exist, and the whole set stays under 150 KB (the originals were about 6 MB)', async () => {
    const { LOUNGE_MEDIA } = await import('@/components/guest/vibers-lobby/lounge-media');
    let total = 0;
    for (const src of Object.values(LOUNGE_MEDIA)) {
      const file = join(process.cwd(), 'public', src);
      expect(existsSync(file), file).toBe(true);
      expect(src).toMatch(/-v\d+\.webp$/);
      const size = statSync(file).size;
      expect(size).toBeLessThan(60 * KB);
      total += size;
    }
    expect(total).toBeLessThan(150 * KB);
  });
});