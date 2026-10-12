import React from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { FOCUS } from '../ui';
import { typePhoto } from '../photos';

interface Props {
  /** A type key (trip, coffee ...) whose photo fills the tile. Without one, a plain forest tile with the icon. */
  type?: string;
  icon?: LucideIcon;
  label: string;
  sub?: string;
  active?: boolean;
  tone?: 'photo' | 'accent';
  /** `row` tiles sit in a scrolling strip; `grid` tiles fill their grid cell. */
  layout: 'row' | 'grid';
  /** Smaller text, for a dense grid of tiles. */
  compact?: boolean;
  onClick: () => void;
}

/**
 * A square photo tile with its name along the bottom, like a phone app's category picker. Used to pick a
 * type to filter by, and to start a meetup in one tap.
 */
export const PhotoTile = React.memo(function PhotoTile({ type, icon: Icon, label, sub, active, tone = 'photo', layout, compact, onClick }: Props) {
  const size = layout === 'row' ? 'h-[92px] w-[92px] shrink-0 snap-start sm:h-[104px] sm:w-[104px]' : 'aspect-square w-full';
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={sub ? `${label}, ${sub}` : label}
      className={`group relative overflow-hidden rounded-[22px] text-left transition active:scale-[0.97] ${size} ${tone === 'accent' ? 'bg-[#c8da4a] text-[#14261b]' : 'bg-[#17301f] text-white'} ${active ? 'ring-[3px] ring-[#17301f] ring-offset-2 ring-offset-[#f1efe6]' : ''} ${FOCUS}`}>
      {type && tone === 'photo' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={typePhoto(type, layout === 'row' ? 240 : 320)} alt="" loading="lazy" decoding="async" draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      )}
      {tone === 'photo' && <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/5" />}
      {Icon && <Icon aria-hidden="true" className={`absolute left-2.5 top-2.5 h-5 w-5 ${tone === 'accent' ? 'text-[#14261b]' : 'text-white/90 drop-shadow'}`} strokeWidth={2} />}
      {active && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#c8da4a] text-[#14261b]"><Check aria-hidden="true" className="h-3 w-3" strokeWidth={3.5} /></span>}
      <span className={`absolute inset-x-0 bottom-0 ${compact ? 'p-1.5' : 'p-2.5'}`}>
        <span className={`block truncate font-bold leading-tight ${compact ? 'text-[10.5px]' : 'text-[13px]'}`}>{label}</span>
        {sub && <span className={`mt-0.5 block text-[10.5px] font-medium leading-tight ${tone === 'accent' ? 'text-[#14261b]/70' : 'text-white/75'}`}>{sub}</span>}
      </span>
    </button>
  );
});
