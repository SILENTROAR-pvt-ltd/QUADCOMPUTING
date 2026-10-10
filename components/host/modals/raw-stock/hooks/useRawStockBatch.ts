'use client';

import { useState } from 'react';
import {
  CriticalStockTemplate,
  BatchIngestItem,
  calculateBatchValuation,
  validateBatchItem,
} from '../raw-stock.types';
import { CRITICAL_STOCK_TEMPLATES } from '../raw-stock.constants';

export function useRawStockBatch(onSuccess: (msg?: string) => void, onClose: () => void) {
  const [selectedBatch, setSelectedBatch] = useState<BatchIngestItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleTemplate = (template: CriticalStockTemplate) => {
    setError(null);
    setSelectedBatch((prev) => {
      const exists = prev.find((it) => it.id === template.id);
      if (exists) {
        return prev.filter((it) => it.id !== template.id);
      }
      return [
        ...prev,
        {
          id: template.id,
          name: template.name,
          category: template.category,
          unit: template.unit,
          icon: template.icon,
          quantity: template.defaultQty.toString(),
          costPerUnit: template.defaultCost.toString(),
          threshold: template.defaultThreshold.toString(),
          isCritical: true,
        },
      ];
    });
  };

  const handleSelectAllTemplates = () => {
    setError(null);
    setSelectedBatch((prev) => {
      const templatesList: BatchIngestItem[] = CRITICAL_STOCK_TEMPLATES.map((tmpl) => {
        const existing = prev.find((it) => it.id === tmpl.id);
        if (existing) return existing;
        return {
          id: tmpl.id,
          name: tmpl.name,
          category: tmpl.category,
          unit: tmpl.unit,
          icon: tmpl.icon,
          quantity: tmpl.defaultQty.toString(),
          costPerUnit: tmpl.defaultCost.toString(),
          threshold: tmpl.defaultThreshold.toString(),
          isCritical: true,
        };
      });
      const customItems = prev.filter((it) => !CRITICAL_STOCK_TEMPLATES.some((t) => t.id === it.id));
      return [...templatesList, ...customItems];
    });
  };

  const handleClearBatch = () => {
    setSelectedBatch([]);
    setError(null);
  };

  const handleUpdateBatchItem = (id: string, field: keyof BatchIngestItem, value: any) => {
    setSelectedBatch((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveBatchItem = (id: string) => {
    setSelectedBatch((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddCustomItem = (newItem: BatchIngestItem) => {
    setSelectedBatch((prev) => [...prev, newItem]);
  };

  const totalBatchValuation = calculateBatchValuation(selectedBatch);

  const handleCommitBatch = async (keepOpen: boolean = false) => {
    setError(null);
    if (selectedBatch.length === 0) {
      setError('Please select at least one item from the grid or enter a custom supply.');
      return;
    }

    for (const it of selectedBatch) {
      const validationError = validateBatchItem(it);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = selectedBatch.map((it) => ({
        itemName: it.name,
        category: it.category,
        unit: it.unit,
        currentStock: parseFloat(it.quantity) || 0,
        costPerUnit: parseFloat(it.costPerUnit) || 0,
        threshold: parseFloat(it.threshold) || 5,
        is_critical: it.isCritical,
      }));

      const res = await fetch('/api/host/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to ingest raw stock items.');
      }

      const totalVal = calculateBatchValuation(selectedBatch);
      const count = selectedBatch.length;
      const successMsg = `Successfully ingested ${count} raw stock ${
        count === 1 ? 'item' : 'items'
      } (Total Valuation: ₹${totalVal.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })})!`;

      if (keepOpen) {
        onSuccess(successMsg);
        setSelectedBatch([]);
      } else {
        onSuccess(successMsg);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedBatch,
    isSubmitting,
    error,
    setError,
    totalBatchValuation,
    handleToggleTemplate,
    handleSelectAllTemplates,
    handleClearBatch,
    handleUpdateBatchItem,
    handleRemoveBatchItem,
    handleAddCustomItem,
    handleCommitBatch,
  };
}
