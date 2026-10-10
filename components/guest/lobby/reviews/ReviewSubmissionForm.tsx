'use client';

import React, { useState, useRef } from 'react';
import { Star, Send, Check, ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { AVAILABLE_REVIEW_TAGS } from './reviews.constants';
import { ReviewSubmissionPayload } from './review.types';

interface ReviewSubmissionFormProps {
  currentUserName: string;
  currentUserTable: string;
  onSubmit: (payload: ReviewSubmissionPayload) => void;
  onCancel?: () => void;
}

export function ReviewSubmissionForm({
  currentUserName,
  currentUserTable,
  onSubmit,
  onCancel,
}: ReviewSubmissionFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Atmosphere']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setAttachedImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const resolvedAuthor = currentUserName && currentUserName !== 'You' && currentUserName !== 'Guest'
      ? currentUserName
      : (typeof window !== 'undefined' ? localStorage.getItem('guest_handle') || currentUserName : currentUserName);

    setTimeout(() => {
      onSubmit({
        author: resolvedAuthor || 'Guest',
        table: currentUserTable || 'T-01',
        rating,
        comment: comment.trim(),
        tags: selectedTags,
        images: attachedImages.length > 0 ? attachedImages : undefined,
      });
      setComment('');
      setAttachedImages([]);
      setIsSubmitting(false);
    }, 350);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-7 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden animate-in fade-in-50 duration-200"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-normal text-neutral-950">
            Share Your Experience
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Rating as <span className="text-neutral-950 font-medium">{currentUserName}</span> at{' '}
            <span className="text-neutral-950 font-mono px-1.5 py-0.5 rounded-md bg-neutral-50 border border-neutral-200">
              {currentUserTable}
            </span>
          </p>
        </div>

        {/* Glowing Ancient Light Cream Stars */}
        <div className="flex items-center gap-1 bg-neutral-50 px-3 py-1.5 rounded-2xl border border-neutral-200">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 cursor-pointer transition-transform hover:scale-125 active:scale-95"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`w-5 h-5 transition-all ${
                  star <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-neutral-300'
                }`}
              />
            </button>
          ))}
          <span className="text-xs font-mono font-semibold text-amber-400 ml-1.5">
            {hoverRating || rating}.0
          </span>
        </div>
      </div>

      {/* Experience Tags Multi-select */}
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
          Select Experience Tags
        </label>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_REVIEW_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-950 text-white font-semibold border-neutral-950'
                    : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editorial Comment Textarea */}
      <div className="space-y-2">
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How was the food, service and atmosphere?"
          className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-neutral-950 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 resize-none transition-all"
          required
        />
      </div>

      {/* Image Upload & Live Thumbnail Previews */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-neutral-950 text-xs font-medium transition-colors cursor-pointer active:scale-95"
          >
            <ImagePlus className="w-4 h-4 text-neutral-500" />
            <span>Add Photos</span>
          </button>
          <span className="text-[11px] text-neutral-500">
            JPG, PNG or WebP up to 10MB
          </span>
        </div>

        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap pt-2">
            {attachedImages.map((img, idx) => (
              <div
                key={idx}
                className="relative w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 group shadow-md"
              >
                <Image
                  src={img}
                  alt={`Attachment ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/75 text-white hover:bg-rose-500 transition-colors cursor-pointer"
                  aria-label="Remove image"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !comment.trim()}
          className="inline-flex items-center gap-2 bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer active:scale-95"
        >
          {isSubmitting ? (
            <Check className="w-3.5 h-3.5 animate-bounce" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{isSubmitting ? 'Publishing...' : 'Publish Feedback'}</span>
        </button>
      </div>
    </form>
  );
}

export default ReviewSubmissionForm;
