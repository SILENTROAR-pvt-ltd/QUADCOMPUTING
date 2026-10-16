'use client';

import React from 'react';
import { HOST_SCREENS } from './HostScreens';
import { GUEST_SCREENS } from './GuestScreens';

export const SCREEN_IDS = [...Object.keys(HOST_SCREENS), ...Object.keys(GUEST_SCREENS)];

/** One product screen with the fictional café's data, for scripts/capture-landing-shots.mjs to photograph. */
export function ShowcaseScreen({ id }: { id: string }) {
  const Screen = HOST_SCREENS[id] ?? GUEST_SCREENS[id];
  return Screen ? <main data-showcase={id}><Screen /></main> : <p>Unknown screen.</p>;
}
