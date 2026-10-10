import { useState, useEffect } from 'react';
import type { CatalogItem } from '@/types';

export function useEditItemForm(item: CatalogItem | null) {
  const [activeType, setActiveType] = useState<'food' | 'room' | 'service'>('food');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('0');
  const [serviceCategory, setServiceCategory] = useState('Services');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceProvider, setServiceProvider] = useState<'in_house' | 'third_party'>('in_house');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceImageUrl, setServiceImageUrl] = useState('');

  useEffect(() => {
    if (item) {
      if (item.kind === 'accommodation') setActiveType('room');
      else if (item.kind === 'service') setActiveType('service');
      else setActiveType('food');

      setServiceName(item.name || '');
      const rawPrice = item.kind === 'accommodation'
        ? (item.nightlyRate?.amountMinor || 0)
        : (item.price?.amountMinor || 0);
      setServicePrice(String(rawPrice));
      setServiceDescription(item.description || '');
      setServiceImageUrl(item.imageUrl || '');
    }
  }, [item]);

  return {
    activeType, setActiveType, isSubmitting, setIsSubmitting,
    error, setError, serviceName, setServiceName,
    servicePrice, setServicePrice, serviceCategory, setServiceCategory,
    serviceDuration, setServiceDuration, serviceProvider, setServiceProvider,
    serviceDescription, setServiceDescription, serviceImageUrl, setServiceImageUrl,
  };
}
