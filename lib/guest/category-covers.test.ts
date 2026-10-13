// The category chips show the venue's own dish photos: each category's first photographed dish, a different photo for
// "All dishes" where there is one, and a small version from hosts that can resize, so the row loads in a blink.
import { describe, expect, it } from 'vitest';
import { categoryCovers, chipPhoto } from './category-covers';

describe('Category cover photos', () => {
  it("uses each category's first dish with a photo, in menu order", () => {
    const covers = categoryCovers([
      { category: 'Beverages', image_url: '' },
      { category: 'Beverages', image_url: 'https://x.test/cold-coffee.jpg' },
      { category: 'beverages ', image_url: 'https://x.test/lassi.jpg' },
      { category: 'Quick Bites', image_url: 'https://x.test/fries.jpg' },
      { category: 'Salads', image_url: null },
    ]);
    expect(covers.beverages).toBe('https://x.test/cold-coffee.jpg');
    expect(covers['quick bites']).toBe('https://x.test/fries.jpg');
    expect(covers.salads).toBeUndefined();
  });

  it('gives "All dishes" a photo no category is using, else the first photo, else nothing', () => {
    expect(categoryCovers([
      { category: 'Pizza', image_url: 'https://x.test/a.jpg' },
      { category: 'Pizza', image_url: 'https://x.test/b.jpg' },
    ]).dining).toBe('https://x.test/b.jpg');
    expect(categoryCovers([{ category: 'Pizza', image_url: 'https://x.test/a.jpg' }]).dining).toBe('https://x.test/a.jpg');
    expect(categoryCovers([{ category: 'Pizza' }])).toEqual({});
  });

  it('asks Supabase Storage for a small square version of an uploaded photo', () => {
    expect(chipPhoto('https://abc.supabase.co/storage/v1/object/public/venue-vault/v1/dishes/p.jpg'))
      .toBe('https://abc.supabase.co/storage/v1/render/image/public/venue-vault/v1/dishes/p.jpg?width=160&height=160&resize=cover&quality=70');
  });

  it('uses the small Wikimedia thumbnail, and resizes Unsplash and Pexels photos', () => {
    expect(chipPhoto('https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Cup.JPG/960px-Cup.JPG?utm_source=x'))
      .toBe('https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Cup.JPG/250px-Cup.JPG');
    expect(chipPhoto('https://images.unsplash.com/photo-1?w=1200')).toContain('w=160');
    expect(chipPhoto('https://images.pexels.com/photos/1/p.jpeg?w=1200')).toBe('https://images.pexels.com/photos/1/p.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=160&h=160');
  });

  it('leaves any other photo as it is', () => {
    expect(chipPhoto('https://cdn.example.com/p.jpg')).toBe('https://cdn.example.com/p.jpg');
    expect(chipPhoto('/local/p.jpg')).toBe('/local/p.jpg');
    expect(chipPhoto('https://abc.supabase.co/storage/v1/object/sign/private/p.jpg?token=t')).toBe('https://abc.supabase.co/storage/v1/object/sign/private/p.jpg?token=t');
  });
});
