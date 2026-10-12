import { Backpack, Briefcase, Camera, Flower2, Gem, HandHeart, Landmark, Laptop, Leaf, Megaphone, Mountain, Pen, PartyPopper, Plane, Utensils, type LucideIcon } from 'lucide-react';
import type { TravelerKind } from '@/lib/club/identity/profile-details';

export const KIND_META: Record<TravelerKind, { label: string; icon: LucideIcon }> = {
  solo: { label: 'Solo traveller', icon: Plane },
  nomad: { label: 'Digital nomad', icon: Laptop },
  volunteer: { label: 'Volunteer', icon: HandHeart },
  influencer: { label: 'Influencer', icon: Megaphone },
  creator: { label: 'Content creator', icon: Pen },
  photographer: { label: 'Photographer', icon: Camera },
  foodie: { label: 'Foodie', icon: Utensils },
  adventure: { label: 'Adventure seeker', icon: Mountain },
  backpacker: { label: 'Backpacker', icon: Backpack },
  luxury: { label: 'Luxury traveller', icon: Gem },
  slow: { label: 'Slow traveller', icon: Leaf },
  wellness: { label: 'Wellness & yoga', icon: Flower2 },
  culture: { label: 'Culture explorer', icon: Landmark },
  business: { label: 'Business traveller', icon: Briefcase },
  festival: { label: 'Festival goer', icon: PartyPopper },
};

export const KIND_KEYS = Object.keys(KIND_META) as TravelerKind[];
