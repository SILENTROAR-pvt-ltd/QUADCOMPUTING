import React from 'react';
import { initials } from './lobby-format';

interface LobbyAvatarProps {
  name: string;
  emoji: string;
  url: string | null;
  small?: boolean;
}

/** The guest's profile photo, or their emoji, or their initials. */
export function LobbyAvatar({ name, emoji, url, small = false }: LobbyAvatarProps) {
  const size = small ? 'h-8 w-8 rounded-xl text-sm' : 'h-10 w-10 rounded-2xl text-lg';
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden border border-[#e8e2d5] bg-[#faf8f5] ${size}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{emoji || initials(name)}</span>
      )}
    </span>
  );
}

export default LobbyAvatar;
