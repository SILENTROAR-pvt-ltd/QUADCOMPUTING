import React from 'react';
import { Globe } from 'lucide-react';
import type { SocialNetwork } from '@/lib/club/identity/profile-details';

// Simple line logos for the social networks (drawn here, since the icon set has no brand marks).
// Each keeps one stroke weight so a row of them looks like one family.
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const PATHS: Record<Exclude<SocialNetwork['key'], 'website'>, React.ReactNode> = {
  instagram: (<><rect x="3" y="3" width="18" height="18" rx="5" {...stroke} /><circle cx="12" cy="12" r="4" {...stroke} /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></>),
  youtube: (<><rect x="2.5" y="5.5" width="19" height="13" rx="4" {...stroke} /><path d="M10.2 9.3l4.6 2.7-4.6 2.7z" fill="currentColor" /></>),
  x: (<><path d="M4 4h4.2l11.8 16h-4.2z" {...stroke} /><path d="M19.5 4L5 20" {...stroke} /></>),
  tiktok: (<path d="M14 3v11.2a3.8 3.8 0 1 1-3.8-3.8M14 3c.5 3 2.6 5 5.5 5.3" {...stroke} />),
  linkedin: (<><rect x="3" y="3" width="18" height="18" rx="3" {...stroke} /><path d="M8 10.5V16M8 7.8v.1M11.5 16v-5.5M11.5 12.5c0-1.4 1-2.2 2.3-2.2s2.2.8 2.2 2.4V16" {...stroke} /></>),
  facebook: (<><rect x="3" y="3" width="18" height="18" rx="5" {...stroke} /><path d="M13.4 21v-7.4h2.4l.4-2.9h-2.8V8.9c0-.8.3-1.4 1.4-1.4h1.4V5c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2.2H8.9v2.9h2.3V21z" fill="currentColor" stroke="none" /></>),
};

/** One network's logo, drawn in the current text colour. */
export function BrandMark({ network, className = 'h-[18px] w-[18px]' }: { network: SocialNetwork['key']; className?: string }) {
  if (network === 'website') return <Globe aria-hidden="true" className={className} strokeWidth={1.8} />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {PATHS[network]}
    </svg>
  );
}
