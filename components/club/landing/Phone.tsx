import React from 'react';
import { Globe, House, MapPin, MessageSquare, Plane, type LucideIcon } from 'lucide-react';

const TABS: Array<[LucideIcon, string]> = [[House, 'Home'], [Plane, 'Explore'], [MapPin, 'Trips'], [Globe, 'Community'], [MessageSquare, 'Messages']];

/** A soft white phone around a mini screen of the app, with the floating forest tab bar. */
export function Phone({ children, tab, className = '' }: { children: React.ReactNode; tab?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative w-[244px] shrink-0 rounded-[44px] bg-white p-[7px] shadow-[0_40px_70px_-30px_rgba(20,38,27,0.55)] ${className}`}>
      <div className="relative h-[500px] overflow-hidden rounded-[37px] bg-[#f4f3ec] text-[#14261b]">
        <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-semibold"><span>9:41</span><span className="h-[18px] w-16 rounded-full bg-[#14261b]" /><span>●●●</span></div>
        <div className="px-3.5 pt-2">{children}</div>
        {tab !== undefined && (
          <div className="absolute inset-x-3 bottom-3 grid grid-cols-5 rounded-full bg-[#17301f] px-1 py-1.5">
            {TABS.map(([Icon, label], i) => (
              <span key={label} className={`mx-auto grid h-7 w-7 place-items-center rounded-full ${i === tab ? 'bg-[#c8da4a] text-[#17301f]' : 'text-[#f6f4ec]/70'}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A tiny face for the mock-ups: initials on a sage gradient (no stock photos of real people). */
export function MiniFace({ name, size = 22, tone = 0, ring = 'ring-white' }: { name: string; size?: number; tone?: number; ring?: string }) {
  const tones = ['from-[#dfe9c4] to-[#9fbf7a]', 'from-[#f6e3c3] to-[#d9a95f]', 'from-[#d6e6ef] to-[#88aec4]', 'from-[#f1d6d2] to-[#c98d84]'];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-[#17301f] ring-2 ${ring} ${tones[tone % tones.length]}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
    </span>
  );
}
