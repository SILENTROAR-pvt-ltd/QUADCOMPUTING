import React from 'react';

// An iPhone 15 Pro, drawn to scale (a 393 × 852 point screen): titanium band, black bezel, Dynamic Island, the status bar,
// Safari's address bar and the home indicator. Everything inside is sized in container units, so it holds at any width.

const Signal = () => (
  <svg viewBox="0 0 18 12" className="h-[2.6cqw] w-auto" aria-hidden="true"><g fill="currentColor">
    <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" />
  </g></svg>
);
const Wifi = () => (
  <svg viewBox="0 0 16 12" className="h-[2.6cqw] w-auto" aria-hidden="true"><path fill="currentColor" d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.4A10.6 10.6 0 0 0 8 .3 10.6 10.6 0 0 0 .7 3.2L2 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.8c1.3 0 2.5.5 3.4 1.3l1.4-1.4A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.8 1.9l1.4 1.4C5.5 6.5 6.7 6 8 6Zm0 3.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z" /></svg>
);
const Battery = () => (
  <svg viewBox="0 0 27 13" className="h-[2.8cqw] w-auto" aria-hidden="true">
    <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
    <rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor" /><path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="currentColor" opacity="0.45" />
  </svg>
);

interface Props { url: string; className?: string; children: React.ReactNode }

export function IPhoneFrame({ url, className = '', children }: Props) {
  return (
    <div className={`relative ${className}`}>
      {/* Side buttons: action and volume on the left, power on the right. */}
      <span aria-hidden="true" className="absolute -left-[1.1%] top-[17%] h-[3.6%] w-[1.6%] rounded-l-sm bg-[#3a3c40]" />
      <span aria-hidden="true" className="absolute -left-[1.1%] top-[24%] h-[7%] w-[1.6%] rounded-l-sm bg-[#3a3c40]" />
      <span aria-hidden="true" className="absolute -left-[1.1%] top-[33%] h-[7%] w-[1.6%] rounded-l-sm bg-[#3a3c40]" />
      <span aria-hidden="true" className="absolute -right-[1.1%] top-[27%] h-[11%] w-[1.6%] rounded-r-sm bg-[#3a3c40]" />

      <div className="rounded-[16%/7.4%] bg-[linear-gradient(145deg,#6b6e73,#2b2d31_38%,#55585d_68%,#1e2023)] p-[1.6%] shadow-[0_50px_90px_-40px_rgba(15,25,18,0.75),0_18px_36px_-24px_rgba(0,0,0,0.6)] ring-1 ring-black/50">
        <div className="rounded-[14.6%/6.8%] bg-[#0a0a0b] p-[3.4%]">
          <div className="relative grid aspect-[393/852] grid-rows-[54fr_728fr_70fr] overflow-hidden rounded-[12.4%/5.7%] bg-white" style={{ containerType: 'inline-size' }}>
            <div className="relative z-10 flex items-center justify-between bg-white/95 px-[8%] pt-[1.5cqw] text-[3.7cqw] font-semibold text-black backdrop-blur">
              <span className="tabular-nums tracking-tight">9:41</span>
              <span aria-hidden="true" className="absolute left-1/2 top-[2.8cqw] h-[9cqw] w-[31%] -translate-x-1/2 rounded-full bg-black" />
              <span className="flex items-center gap-[1.3cqw]"><Signal /><Wifi /><Battery /></span>
            </div>
            <div className="relative min-h-0 overflow-hidden">{children}</div>
            <div className="relative z-10 flex flex-col items-center justify-start gap-[2.2cqw] border-t border-black/5 bg-[#f7f7f8]/95 px-[4%] pt-[2cqw] backdrop-blur">
              <span className="flex w-full items-center justify-center gap-[1.4cqw] rounded-[2.6cqw] bg-[#e9e9eb] py-[1.8cqw] text-[3.3cqw] font-medium text-[#1c1c1e]">
                <svg viewBox="0 0 10 12" className="h-[2.6cqw] w-auto" aria-hidden="true"><path fill="currentColor" d="M5 0a3.5 3.5 0 0 0-3.5 3.5V5H1a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-.5V3.5A3.5 3.5 0 0 0 5 0Zm2 5H3V3.5a2 2 0 1 1 4 0V5Z" /></svg>
                {url}
              </span>
              <span aria-hidden="true" className="h-[1.3cqw] w-[34%] rounded-full bg-black" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
