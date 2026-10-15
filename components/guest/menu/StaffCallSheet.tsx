"use client";

import { useEffect, useRef, useState } from "react";
import { ChefHat, ConciergeBell, Loader2, X } from "lucide-react";

export type CallTarget = "WAITER" | "CHEF";

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
const MAX = 140;

const COPY: Record<CallTarget, { title: string; hint: string; chips: string[]; placeholder: string }> = {
  WAITER: {
    title: "Call the waiter",
    hint: "Tell us what you need, or just call.",
    chips: ["Water", "Cutlery", "Napkins", "Clean the table", "Extra plates", "Ice", "Change the music"],
    placeholder: "e.g. A jug of water for the table, please",
  },
  CHEF: {
    title: "Call the chef",
    hint: "A word with the kitchen, if you would like one.",
    chips: ["Less spicy", "No onion or garlic", "I have an allergy", "Well done, please", "Please hurry", "Pack the leftovers"],
    placeholder: "e.g. Could the paneer be a little less spicy?",
  },
};

interface Props {
  initial: CallTarget;
  /** Sends the call; resolves true when the venue has it. */
  onSend: (target: CallTarget, message: string) => Promise<boolean>;
  onClose: () => void;
}

/** A guest's call to the waiter or chef, with quick requests and a line of their own. Nothing is required: "Call" alone is enough. */
export function StaffCallSheet({ initial, onSend, onClose }: Props) {
  const [target, setTarget] = useState<CallTarget>(initial);
  const [picked, setPicked] = useState<string[]>([]);
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

  const switchTo = (t: CallTarget) => { setTarget(t); setPicked([]); setFailed(false); };
  // A quick request is added to what the guest typed, and taken out again by tapping it twice.
  const toggle = (chip: string) => {
    const on = picked.includes(chip);
    setPicked(on ? picked.filter((c) => c !== chip) : [...picked, chip]);
    setText((cur) => {
      const parts = cur.split(", ").map((p) => p.trim()).filter(Boolean);
      const next = on ? parts.filter((p) => p !== chip) : [...parts.filter((p) => p !== chip), chip];
      return next.join(", ").slice(0, MAX);
    });
  };

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
          <div>
            <h2 id="call-title" className="text-[24px] leading-tight text-zinc-950" style={SERIF}>{copy.title}</h2>
            <p className="mt-0.5 text-[12.5px] text-zinc-500">{copy.hint}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-black/5 disabled:opacity-40 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div role="tablist" aria-label="Who to call" className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-white p-1 ring-1 ring-neutral-200">
          {([["WAITER", "Waiter", ConciergeBell], ["CHEF", "Chef", ChefHat]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={target === id} onClick={() => switchTo(id)}
              className={`flex h-10 items-center justify-center gap-2 rounded-full text-[13px] font-semibold cursor-pointer transition-colors ${target === id ? "bg-zinc-950 text-white" : "text-zinc-600"}`}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Quick requests">
          {copy.chips.map((chip) => {
            const on = picked.includes(chip);
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
            onChange={(e) => { setText(e.target.value); setPicked((cur) => cur.filter((c) => e.target.value.includes(c))); }}
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
          {busy ? "Sending…" : message ? `Send to the ${target === "WAITER" ? "waiter" : "chef"}` : `Call the ${target === "WAITER" ? "waiter" : "chef"}`}
        </button>
      </div>
    </div>
  );
}

export default StaffCallSheet;
