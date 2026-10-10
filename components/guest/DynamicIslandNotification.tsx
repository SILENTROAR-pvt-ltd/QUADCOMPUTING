'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { DynamicIslandNotificationItem } from '@/lib/store/guest-lobby.store';

interface Props {
  notifications: DynamicIslandNotificationItem[];
  onAccept: (item: DynamicIslandNotificationItem) => void;
  onDecline: (item: DynamicIslandNotificationItem) => void;
}

export function DynamicIslandNotification({ notifications, onAccept, onDecline }: Props) {
  if (notifications.length === 0) return null;
  const current = notifications[0];

  const getActionText = () => {
    switch (current.interaction_type) {
      case 'coffee':
        return `invited you for a coffee / drink`;
      case 'join':
        return `sent a joining request`;
      case 'message':
      default:
        return `sent a note`;
    }
  };

  return (
    <div className="fixed top-4 inset-x-0 z-[200] flex justify-center pointer-events-none px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white/95 p-4 text-zinc-900 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-black">
                  {current.sender_table}
                </span>
                <span className="text-xs text-zinc-500 font-light">
                  ({current.sender_name})
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-light">
                {getActionText()}
              </p>
              {current.custom_message && (
                <p className="text-[11px] text-zinc-500 italic pt-1">
                  &ldquo;{current.custom_message}&rdquo;
                </p>
              )}
            </div>

            <button
              onClick={() => onDecline(current)}
              className="text-zinc-400 hover:text-black p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <button
              onClick={() => onDecline(current)}
              className="rounded-full px-3 py-1 text-xs text-zinc-500 hover:text-black transition-colors"
            >
              Decline
            </button>
            <button
              onClick={() => onAccept(current)}
              className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Accept
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
