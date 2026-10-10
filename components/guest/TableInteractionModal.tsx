'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { LobbyPresenceUser } from '@/lib/store/guest-lobby.store';

interface Props {
  targetUser: LobbyPresenceUser;
  currentUserTable: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onClose: () => void;
  onSendInvitation: (payload: {
    interaction_type: 'coffee' | 'join' | 'message';
    custom_message?: string;
  }) => Promise<void>;
}

export function TableInteractionModal({
  targetUser,
  currentUserTable,
  currentUserName,
  onClose,
  onSendInvitation,
}: Props) {
  const [selectedType, setSelectedType] = useState<'coffee' | 'join' | 'message'>('coffee');
  const [customText, setCustomText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSendInvitation({
        interaction_type: selectedType,
        custom_message: customText.trim() || undefined,
      });
      setSentSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      console.error(e);
      alert('Could not send request');
    } finally {
      setIsSending(false);
    }
  };

  const OPTIONS = [
    { type: 'coffee' as const, label: 'Invite for Coffee', desc: 'Treat or offer a coffee/drink' },
    { type: 'join' as const, label: 'Join Request', desc: 'Ask to join tables or have a quick chat' },
    { type: 'message' as const, label: 'Custom Note', desc: 'Send a direct short message' },
  ];

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/30 backdrop-blur-xs">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="w-full max-w-lg rounded-t-3xl bg-white p-6 sm:p-8 border-t border-zinc-200 shadow-xl text-zinc-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-base font-medium text-black">
              Connect with {targetUser.guest_name}
            </h3>
            <p className="text-xs text-zinc-400">
              {targetUser.table_number} • From your table {currentUserTable}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-black transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-10 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-black">
              <Check className="h-5 w-5 stroke-[2.5]" />
            </div>
            <p className="text-sm font-medium text-black">Request Sent</p>
            <p className="text-xs text-zinc-400">
              Notified {targetUser.guest_name} on their device.
            </p>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            {/* Options List */}
            <div className="space-y-2">
              {OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt.type)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-black bg-zinc-50'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-black">{opt.label}</p>
                      <p className="text-xs text-zinc-500 font-light">{opt.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-black" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Note Input */}
            <div className="pt-2">
              <input
                type="text"
                placeholder={selectedType === 'message' ? 'Type your note...' : 'Optional short note...'}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                maxLength={80}
                className="w-full border-b border-zinc-200 bg-transparent py-2.5 text-xs text-zinc-900 placeholder:text-zinc-600 focus:border-black focus:outline-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                onClick={handleSend}
                disabled={isSending}
                className="w-full rounded-full bg-black py-4 text-xs font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
