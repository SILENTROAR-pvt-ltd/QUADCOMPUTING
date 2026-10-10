import { useState } from 'react';
import type { OfferCategory } from '@/types/offers';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

interface UseCreateOfferFormProps {
  venueId: string;
  onSuccess: () => void;
}

export function useCreateOfferForm({ venueId, onSuccess }: UseCreateOfferFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<OfferCategory>('food');
  const [discountBadge, setDiscountBadge] = useState('20% OFF');
  const [customBadge, setCustomBadge] = useState('');
  const [validDays, setValidDays] = useState('7');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBadge = customBadge.trim() || discountBadge;
    if (!title.trim() || !finalBadge.trim()) {
      setError('Add a title and a discount tag before publishing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const validUntil =
      validDays === 'none'
        ? null
        : new Date(Date.now() + parseInt(validDays, 10) * 86400000).toISOString();

    // apiRequest reports the server's own message, so a rejected publish is shown instead of closing the form.
    const result = await apiRequest('/api/venue/offers', jsonRequest('POST', {
      venue_id: venueId,
      title: title.trim(),
      description: description.trim() || null,
      category,
      discount_badge: finalBadge,
      valid_until: validUntil,
      is_active: true,
    }));
    setIsSubmitting(false);

    if (result.ok) onSuccess();
    else setError(result.error ?? 'The offer could not be published. Please try again.');
  };

  return {
    title, setTitle,
    description, setDescription,
    category, setCategory,
    discountBadge, setDiscountBadge,
    customBadge, setCustomBadge,
    validDays, setValidDays,
    isSubmitting,
    error,
    handleSubmit,
  };
}
