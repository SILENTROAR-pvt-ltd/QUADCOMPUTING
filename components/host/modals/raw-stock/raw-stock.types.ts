export interface CriticalStockTemplate {
  id: string;
  name: string;
  category: string;
  unit: string;
  icon: string;
  defaultCost: number;
  defaultThreshold: number;
  defaultQty: number;
}

export interface BatchIngestItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  icon: string;
  quantity: string;
  costPerUnit: string;
  threshold: string;
  isCritical: boolean;
}

export interface NewRawStockModalProps {
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

export function calculateBatchValuation(items: BatchIngestItem[]): number {
  return items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.costPerUnit) || 0;
    return sum + qty * cost;
  }, 0);
}

export function validateBatchItem(item: BatchIngestItem): string | null {
  const q = parseFloat(item.quantity);
  const c = parseFloat(item.costPerUnit);
  const t = parseFloat(item.threshold);
  if (isNaN(q) || q < 0) {
    return `"${item.name}" has invalid quantity. Must be 0 or greater.`;
  }
  if (isNaN(c) || c < 0) {
    return `"${item.name}" has invalid unit cost. Must be 0 or greater.`;
  }
  if (isNaN(t) || t < 0) {
    return `"${item.name}" has invalid low-stock threshold. Must be 0 or greater.`;
  }
  return null;
}
