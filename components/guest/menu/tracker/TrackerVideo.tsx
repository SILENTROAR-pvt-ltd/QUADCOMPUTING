'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TrackerVideoProps {
  src: string;
  /** A small still of the clip: shown while the clip loads, and instead of it whenever motion is not wanted. */
  poster: string;
  /** Positions and sizes the box that holds the poster and the clip (give it elative or bsolute). */
  className?: string;
  /** How the picture fills its box: the banner covers it, a portrait fits it. */
  fit?: 'cover' | 'contain';
  /** Where the picture is anchored when it is cropped, e.g. "70% 50%". */
  position?: string;
}

/**
 * Whether this phone should be sent a video at all. Reduced motion, Data Saver and 2G all get the still picture only.
 * Decided in the browser, so the server never has to guess.
 */
export function motionAllowed(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData) return false;
    if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  } catch {
    // An old browser without these checks: play.
  }
  return true;
}

/**
 * A muted, looping, decorative clip that costs almost nothing:
 *  - nothing is downloaded until it is close to the screen, and it pauses when it leaves the screen or the tab is hidden;
 *  - the still poster is always there first, so there is never an empty box;
 *  - if the clip cannot play (data saver, low-power mode, an error), the poster simply stays.
 * It carries no sound and is hidden from screen readers.
 */
export function TrackerVideo({ src, poster, className = '', fit = 'cover', position = '50% 50%' }: TrackerVideoProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [wanted, setWanted] = useState(false);
  const [near, setNear] = useState(false);
  // Once it has started to load the source stays, so scrolling away and back never asks for the file again.
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setWanted(motionAllowed()); }, []);
  useEffect(() => { if (near) setLoaded(true); }, [near]);

  // Near the screen: start loading. Far from it: stop playing.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !wanted || typeof IntersectionObserver === 'undefined') { if (wanted) setNear(true); return; }
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: '160px', threshold: 0.01 });
    observer.observe(box);
    return () => observer.disconnect();
  }, [wanted]);

  // Play while near the screen and the tab is in front; pause otherwise.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => {
      if (near && !document.hidden) void video.play().catch(() => { /* low-power mode or blocked: the poster stays */ });
      else video.pause();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [near, wanted, src]);

  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain';
  const showVideo = wanted && !failed;

  return (
    <div ref={boxRef} aria-hidden="true" className={`overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a 5-10 KB still from public/media; images.unoptimized is set, so next/image would not shrink it either */}
      <img src={poster} alt="" decoding="async" className={`absolute inset-0 h-full w-full ${fitClass}`} style={{ objectPosition: position }} />
      {showVideo && (
        <video
          ref={videoRef}
          src={loaded ? src : undefined}
          muted
          loop
          playsInline
          autoPlay
          preload={loaded ? 'auto' : 'none'}
          tabIndex={-1}
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full ${fitClass} transition-opacity duration-700 ${playing ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectPosition: position }}
        />
      )}
    </div>
  );
}

export default TrackerVideo;
