'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { LobbyPresenceUser } from '@/lib/store/guest-lobby.store';
import { InteractionOptions, type InteractionType } from './interaction/InteractionOptions';

interface Props {
  targetUser: LobbyPresenceUser;
  currentUserTable: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onClose: () => void;
  onSendInvitation: (payload: { interaction_type: InteractionType; custom_message?: string }) => Promise<void>;
}

/** Reach out to another table: a coffee, a request to join, or a short note. */
export function TableInteractionModal({ targetUser, currentUserTable, onClose, onSendInvitation }: Props) {
  const [type, setType] = useState<InteractionType>('coffee');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const send = async () => {
    setSending(true);
    setFailed(false);
    try {
      await onSendInvitation({ interaction_type: type, custom_message: note.trim() || undefined });
      setSent(true);
      setTimeout(onClose, 1500);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/30 backdrop-blur-xs">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="w-full max-w-lg rounded-t-3xl border-t border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-base font-medium text-black">Connect with {targetUser.guest_name}</h3>
            <p className="text-xs text-zinc-400">{targetUser.table_number} • From your table {currentUserTable}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 cursor-pointer place-items-center text-zinc-400 hover:text-black"><X className="h-5 w-5" /></button>
        </div>

        {sent ? (
          <div className="space-y-2 py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-black"><Check className="h-5 w-5 stroke-[2.5]" /></div>
            <p className="text-sm font-medium text-black">Request Sent</p>
            <p className="text-xs text-zinc-400">Notified {targetUser.guest_name} on their device.</p>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <InteractionOptions value={type} onChange={setType} />
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} aria-label="Optional note"
              placeholder={type === 'message' ? 'Type your note...' : 'Optional short note...'}
              className="w-full border-b border-zinc-200 bg-transparent py-2.5 text-[16px] text-zinc-900 transition-colors placeholder:text-zinc-500 focus:border-black focus:outline-none sm:text-xs" />
            {failed && <p role="alert" className="text-xs font-medium text-rose-600">We could not send that just now. Please try again.</p>}
            <button type="button" onClick={() => void send()} disabled={sending}
              className="w-full cursor-pointer rounded-full bg-black py-4 text-xs font-medium text-white transition-colors hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50">
              {sending ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
