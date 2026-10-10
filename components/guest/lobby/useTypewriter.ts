// components/guest/lobby/useTypewriter.ts
'use client';

import { useState, useEffect } from 'react';

export function useTypewriter(text: string, enabled: boolean, speed = 16): string {
  const [out, setOut] = useState(enabled ? '' : text);

  useEffect(() => {
    if (!enabled) {
      setOut(text);
      return;
    }
    setOut('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, enabled, speed]);

  return out;
}
