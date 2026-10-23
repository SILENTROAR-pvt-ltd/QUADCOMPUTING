import { describe, it, expect } from 'vitest';
import { modulesFor } from '@/lib/venue/venue-model';
import { tourSteps } from './tour-steps';

const labels = { catalog: 'Menu Catalog', billing: 'Billing & Tables' };

describe('the welcome tour', () => {
  it('walks a café through its own sections, between a welcome and a checklist', () => {
    const steps = tourSteps('food', new Set(modulesFor('food')), labels, 'The Mad kings');
    expect(steps.map((s) => s.id)).toEqual(['welcome', 'profile', 'catalog', 'billing', 'kitchen', 'reservations', 'wallet', 'expenses', 'done']);
    expect(steps[0].title).toBe('The Mad kings is live');
    expect(steps.find((s) => s.id === 'catalog')?.kicker).toBe('Menu Catalog');
  });

  it('gives a stay venue rooms instead of tables and kitchen, in stay words', () => {
    const steps = tourSteps('stay', new Set(modulesFor('stay')), { catalog: 'Services & Add-ons' }, 'Hill House');
    const ids = steps.map((s) => s.id);
    expect(ids).toContain('accommodations');
    expect(ids).not.toContain('kitchen');
    expect(ids).not.toContain('reservations');
    expect(steps.find((s) => s.id === 'catalog')?.title).toBe('Services and add-ons');
    expect(steps.at(-1)?.todo).toContain('Add your room types and rooms');
  });

  it('takes a venue with both through every section it has, each opening its own tab', () => {
    const steps = tourSteps('both', new Set(modulesFor('both')), labels, 'Bombay Rasoi');
    expect(steps.map((s) => s.id)).toEqual(['welcome', 'profile', 'catalog', 'billing', 'kitchen', 'accommodations', 'reservations', 'wallet', 'expenses', 'done']);
    expect(steps.filter((s) => s.id !== 'welcome').every((s) => s.tab)).toBe(true);
  });
});
