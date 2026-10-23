'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { VibeyReply, type VibeyReplyProps } from './VibeyReply';

/** One turn: the guest's words in a forest bubble, or Vibey's reply (typed out live, then its dishes and suggestions). */
export function VibeyMessage(props: VibeyReplyProps) {
  const calm = useReducedMotion();
  const { msg } = props;
  if (msg.role === 'guest') {
    return (
      <motion.p dir="auto" initial={calm ? false : { opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: 'easeOut' }}
        className="ml-auto max-w-[82%] rounded-[20px] rounded-br-md bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-4 py-2.5 text-[14.5px] leading-snug text-[#f5f1e8] shadow-[0_12px_24px_-16px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/25">
        {msg.text}
      </motion.p>
    );
  }
  return (
    <motion.div initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <VibeyReply {...props} />
    </motion.div>
  );
}
