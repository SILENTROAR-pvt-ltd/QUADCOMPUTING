"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ConciergeBell, Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/guest/shared/BottomSheet";
import { SheetHeader } from "@/components/guest/shared/SheetHeader";
import { press } from "./motion";

export type CallTarget = "WAITER" | "CHEF";

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

const parts = (s: string) => s.split(", ").map((p) => p.trim()).filter(Boolean);

/** A guest's request for table service, with quick requests and a line of their own. Nothing is required: the button alone is enough. */
export function StaffCallSheet({ initial, onSend, onClose }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = COPY[initial];

  // A quick request is added to what the guest typed, and taken out again by tapping it twice. What is on is read from the
  // text itself, so typing a chip's words by hand and tapping the chip agree.
  const chosen = parts(text);
  const toggle = (chip: string) => setText((cur) => {
    const now = parts(cur);
    return (now.includes(chip) ? now.filter((p) => p !== chip) : [...now, chip]).join(", ").slice(0, MAX);
  });
  const message = text.trim();

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await onSend(initial, message);
    setBusy(false);
    if (ok) onClose(); else setFailed(true);
  };

  return (
    <BottomSheet labelledBy="call-title" onClose={onClose} locked={busy}>
      <SheetHeader id="call-title" icon={<ConciergeBell className="h-[18px] w-[18px]" />} title={copy.title} subtitle={copy.hint} onClose={onClose} disabled={busy} />

      <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Quick requests">
        {copy.chips.map((chip) => {
          const on = chosen.includes(chip);
          return (
            <motion.button key={chip} type="button" aria-pressed={on} onClick={() => toggle(chip)} {...press}
              className={`cursor-pointer rounded-full border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${on ? "border-zinc-950 bg-zinc-950 text-white" : "border-neutral-200 bg-white text-zinc-700"}`}>
              {chip}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4">
        <textarea value={text} maxLength={MAX} rows={3} onChange={(e) => setText(e.target.value)} aria-label="Your message to the staff" placeholder={copy.placeholder}
          className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[16px] leading-relaxed text-zinc-900 placeholder:text-neutral-400 focus:border-zinc-900 focus:outline-none" />
        <p className="mt-1 text-right text-[11px] text-neutral-400">{text.length}/{MAX}</p>
      </div>

      {failed && <p role="alert" className="mt-1 text-center text-[12.5px] font-medium text-rose-600">We could not reach the staff just now. Please try again, or wave to the waiter.</p>}

      <motion.button type="button" onClick={() => void send()} disabled={busy} {...press}
        className="mt-3 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-950 text-[14px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] hover:bg-zinc-800 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Sending…" : message ? "Send request" : "Request table service"}
      </motion.button>
    </BottomSheet>
  );
}

export default StaffCallSheet;
