"use client";

import { useEffect, useRef, useState } from "react";
import { ConciergeBell, Loader2, X } from "lucide-react";

export type CallTarget = "WAITER" | "CHEF";

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
const MAX = 140;

const COPY: Record<CallTarget, { title: string; hint: string; chips: string[]; placeholder: string }> = {
  WAITER: {
    title: "Request table service",
    hint: "Tell us what you need, or just request service and we will come over.",
    // Polite, simple asks only. Anything about the food goes in the guest's own words below.
    chips: ["Water", "Cutlery", "Napkins", "Clean the table", "Extra plates", "Ice"],
    placeholder: "e.g. A jug of water for the table, please",
  },
  CHEF: {
    title: "Call the chef",
    hint: "A word with the kitchen, if you would like one.",
    chips: ["Less spicy", "No onion or garlic", "I have an allergy", "Well done, please", "Please hurry"],
    placeholder: "e.g. Could the paneer be a little less spicy?",
  },
};

interface Props {
  initial: CallTarget;
  /** Sends the call; resolves true when the venue has it. */
  onSend: (target: CallTarget, message: string) => Promise<boolean>;
  onClose: () => void;
}

/** A guest's request for table service, with quick requests and a line of their own. Nothing is required: the button alone is enough. */
export function StaffCallSheet({ initial, onSend, onClose }: Props) {
  // Guests ask for table service in one way; a word for the kitchen goes in the same message.
  const target: CallTarget = initial;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const copy = COPY[target];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [onClose, busy]);

  // A quick request is added to what the guest typed, and taken out again by tapping it twice. What is on is read from the
  // text itself, so typing a chip's words by hand and tapping the chip agree.
  const parts = (s: string) => s.split(", ").map((p) => p.trim()).filter(Boolean);
  const chosen = parts(text);
  const toggle = (chip: string) => setText((cur) => {
    const now = parts(cur);
    const next = now.includes(chip) ? now.filter((p) => p !== chip) : [...now, chip];
    return next.join(", ").slice(0, MAX);
  });
  const message = text.trim();
  const send = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await onSend(target, message);
    setBusy(false);
    if (ok) onClose(); else setFailed(true);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-zinc-950/45 sm:items-center sm:p-6" onClick={() => { if (!busy) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-[28px] bg-[#faf8f2] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5 shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-950 text-white"><ConciergeBell className="h-[18px] w-[18px]" /></span>
            <div>
              <h2 id="call-title" className="text-[22px] leading-tight text-zinc-950" style={SERIF}>{copy.title}</h2>
              <p className="mt-0.5 text-[12.5px] text-zinc-500">{copy.hint}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-black/5 disabled:opacity-40 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>


        <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Quick requests">
          {copy.chips.map((chip) => {
            const on = chosen.includes(chip);
            return (
              <button key={chip} type="button" aria-pressed={on} onClick={() => toggle(chip)}
                className={`rounded-full border px-3.5 py-2 text-[12.5px] font-medium cursor-pointer transition-colors ${on ? "border-zinc-950 bg-zinc-950 text-white" : "border-neutral-200 bg-white text-zinc-700 active:bg-neutral-50"}`}>
                {chip}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <textarea
            ref={area}
            value={text}
            maxLength={MAX}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            aria-label="Your message to the staff"
            placeholder={copy.placeholder}
            className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[16px] leading-relaxed text-zinc-900 placeholder:text-neutral-400 focus:border-zinc-900 focus:outline-none"
          />
          <p className="mt-1 text-right text-[11px] text-neutral-400">{text.length}/{MAX}</p>
        </div>

        {failed && <p role="alert" className="mt-1 text-center text-[12.5px] font-medium text-rose-600">We could not reach the staff just now. Please try again, or wave to the waiter.</p>}

        <button type="button" onClick={() => void send()} disabled={busy}
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] transition-colors hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60 cursor-pointer">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Sending…" : message ? "Send request" : "Request table service"}
        </button>
      </div>
    </div>
  );
}

export default StaffCallSheet;
