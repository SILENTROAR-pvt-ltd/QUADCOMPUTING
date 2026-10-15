"use client";

import React from "react";
import { Smartphone } from "lucide-react";
import { upiPayLink } from "@/lib/utils/upi";

interface UpiApp {
  id: string;
  name: string;
  /** The link scheme that opens this app straight on its pay screen. */
  scheme: string;
  logo: React.ReactNode;
}

// Simple marks in each app's own colours, so a guest can spot the app they use. They are stand-ins, not the official artwork.
const APPS: UpiApp[] = [
  {
    id: "gpay",
    name: "Google Pay",
    scheme: "gpay://upi/pay",
    logo: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden>
        <circle cx="20" cy="20" r="19" fill="#fff" stroke="#e5e7eb" />
        <path d="M30.5 20.4c0-.7-.1-1.4-.2-2H20v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.700 3.3-7.900Z" fill="#4285F4" />
        <path d="M20 31c2.900 0 5.400-1 7.200-2.600l-3.500-2.700c-1 .6-2.200 1-3.700 1-2.800 0-5.200-1.900-6-4.500h-3.600v2.800A10.800 10.800 0 0 0 20 31Z" fill="#34A853" />
        <path d="M14 22.200a6.500 6.500 0 0 1 0-4.400V15H10.400a10.800 10.800 0 0 0 0 9.700L14 22.200Z" fill="#FBBC04" />
        <path d="M20 13.300c1.600 0 3 .5 4.100 1.600l3.100-3.100A10.800 10.800 0 0 0 10.400 15l3.600 2.800c.8-2.600 3.200-4.500 6-4.500Z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    id: "phonepe",
    name: "PhonePe",
    scheme: "phonepe://pay",
    logo: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden>
        <circle cx="20" cy="20" r="19" fill="#5F259F" />
        <path d="M14 12h9.500c2.700 0 4.500 1.700 4.500 4.100 0 2.600-1.900 4.200-4.700 4.200h-3.300V28h-3.600V12Zm3.600 3v2.400h2.900c1 0 1.700-.5 1.700-1.200 0-.8-.7-1.200-1.700-1.200h-2.900Z" fill="#fff" />
      </svg>
    ),
  },
  {
    id: "paytm",
    name: "Paytm",
    scheme: "paytmmp://pay",
    logo: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden>
        <circle cx="20" cy="20" r="19" fill="#fff" stroke="#e5e7eb" />
        <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Arial, sans-serif">
          <tspan fill="#002970">pay</tspan>
          <tspan fill="#00B9F1">tm</tspan>
        </text>
      </svg>
    ),
  },
  {
    id: "bhim",
    name: "BHIM",
    scheme: "upi://pay",
    logo: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden>
        <circle cx="20" cy="20" r="19" fill="#fff" stroke="#e5e7eb" />
        <path d="M9 14l5 12 4-9 4 9 5-12" fill="none" stroke="#F26522" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 14l3 6 4-6" fill="none" stroke="#138808" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

interface Props {
  vpa: string;
  payee: string;
  amount: number;
  /** Shown to the guest in their UPI app, for example "Table T-04". */
  note: string;
  /** Called when the guest taps an app, so the screen can offer "I have paid". */
  onOpened: () => void;
}

/** One tap opens the guest's own UPI app with the venue, amount and note filled in. */
export function UpiAppButtons({ vpa, payee, amount, note, onOpened }: Props) {
  const link = (scheme: string) => upiPayLink({ upiId: vpa, payee, amount, note, scheme });

  return (
    <div className="space-y-2">
      <a
        href={link("upi://pay")}
        onClick={onOpened}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] active:scale-[0.99]"
      >
        <Smartphone className="h-4 w-4" aria-hidden /> Open my UPI app
      </a>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pay with a specific UPI app">
        {APPS.map((app) => (
          <a
            key={app.id}
            href={link(app.scheme)}
            onClick={onOpened}
            className="flex h-12 items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 text-[13px] font-semibold text-zinc-900 transition-colors active:bg-neutral-50"
          >
            {app.logo}
            <span className="truncate">{app.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default UpiAppButtons;
