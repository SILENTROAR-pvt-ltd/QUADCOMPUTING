import Image from 'next/image';
import { SCREENSHOTS, type ScreenshotId } from '@/lib/landing/screenshots';
import { VIDEOS, type VideoId } from '@/lib/landing/videos';
import { ScreenVideo } from './ScreenVideo';

// Real Quad Computing screens (captured from the product with a fictional café's data), framed as a browser window.
// Shared by the Vibers Connect and Quad Computing landing pages. Phones are in LivePhone.tsx.

interface BrowserProps {
  id: ScreenshotId;
  /** Play this recording in the window instead of the still (the still is its poster). */
  video?: VideoId;
  /** The address shown in the bar. */
  url?: string;
  className?: string;
  /** Load at once (the first screen on the page). */
  priority?: boolean;
  /** Show only the top of a tall screen, at this aspect ratio (width / height). */
  crop?: number;
}

export function BrowserShot({ id, video, url = 'quadcomputing.app/host/control-center', className = '', priority = false, crop }: BrowserProps) {
  const shot = SCREENSHOTS[id];
  const ratio = video ? VIDEOS[video].width / VIDEOS[video].height : crop ?? shot.width / shot.height;
  return (
    <figure className={`overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_40px_90px_-40px_rgba(20,38,27,0.55)] ${className}`}>
      <div aria-hidden="true" className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f4f3ee] px-3 py-2 sm:px-4 sm:py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-[10px] text-zinc-500 sm:text-[11px]">{url}</span>
      </div>
      <div className="relative w-full overflow-hidden bg-[#faf9f6]" style={{ aspectRatio: ratio }}>
        {video ? <ScreenVideo id={video} /> : (
          <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} priority={priority}
            sizes="(min-width: 1024px) 760px, 100vw" className="absolute inset-x-0 top-0 h-auto w-full" />
        )}
      </div>
    </figure>
  );
}

/** The small print under a screenshot, so nobody mistakes the demo café for a real one. */
export const SAMPLE_NOTE = 'Real screens · sample café and data';
