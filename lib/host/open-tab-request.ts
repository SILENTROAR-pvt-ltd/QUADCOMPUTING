// A link inside a workspace ("Upgrade in Wallet") opens another section the way the sidebar does, master PIN included.
import { useEffect, useRef } from 'react';

export const OPEN_TAB_EVENT = 'quad:open-tab';

export function requestOpenTab(tab: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPEN_TAB_EVENT, { detail: tab }));
}

/** The control centre's side: each request is handed to its own tab switcher. */
export function useOpenTabRequests(onOpen: (tab: string) => void) {
  const handler = useRef(onOpen);
  useEffect(() => { handler.current = onOpen; });
  useEffect(() => {
    const open = (e: Event) => {
      const tab = (e as CustomEvent<unknown>).detail;
      if (typeof tab === 'string') handler.current(tab);
    };
    window.addEventListener(OPEN_TAB_EVENT, open);
    return () => window.removeEventListener(OPEN_TAB_EVENT, open);
  }, []);
}
