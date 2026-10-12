import React from 'react';
import { SOCIAL_NETWORKS } from '@/lib/club/identity/profile-details';
import { FOCUS } from '../ui';
import { BrandMark } from './BrandMarks';

/**
 * The accounts a member chose to show, as small glass logos. Only networks that were filled in appear;
 * nothing is shown for the rest, so an empty profile has no row at all.
 */
export function SocialLogos({ links }: { links: Partial<Record<string, string>> }) {
  const shown = SOCIAL_NETWORKS.filter((n) => links[n.key]);
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center justify-center gap-2.5" aria-label="Social accounts">
      {shown.map((n) => (
        <li key={n.key}>
          <a href={n.link(links[n.key]!)} target="_blank" rel="noopener noreferrer" aria-label={n.label} title={n.label}
            className={`grid h-11 w-11 place-items-center rounded-full border border-white/80 bg-white/70 text-[#14261b] shadow-[0_10px_24px_-16px_rgba(20,38,27,0.55)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white ${FOCUS}`}>
            <BrandMark network={n.key} />
          </a>
        </li>
      ))}
    </ul>
  );
}
