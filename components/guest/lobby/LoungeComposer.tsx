// components/guest/lobby/LoungeComposer.tsx
'use client';

import React, { useRef } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';
import { LoungeMediaPreview } from './LoungeMediaPreview';

interface LoungeComposerProps {
  newPost: string;
  setNewPost: (val: string) => void;
  imagePreview: string | null;
  onClearImage: () => void;
  onSelectImage: (file: File) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  currentUserName: string;
  currentUserTable: string;
}

export function LoungeComposer({
  newPost,
  setNewPost,
  imagePreview,
  onClearImage,
  onSelectImage,
  onSubmit,
  isSubmitting,
  textareaRef,
}: LoungeComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelectImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit = (newPost.trim().length > 0 || !!imagePreview) && !isSubmitting;

  return (
    <div className="border-t border-neutral-100 bg-white px-3 sm:px-5 py-3">
      {imagePreview && (
        <LoungeMediaPreview imagePreview={imagePreview} onClear={onClearImage} />
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 w-10 h-10 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer active:scale-95"
          aria-label="Attach photo"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Say something to the room…"
            aria-label="Message the venue chat"
            maxLength={400}
            rows={1}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3.5 py-2.5 text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white resize-none leading-relaxed transition-colors block"
            style={{ minHeight: '42px', maxHeight: '110px' }}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-neutral-950 text-white hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm cursor-pointer"
          aria-label="Send message"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}

export default LoungeComposer;
