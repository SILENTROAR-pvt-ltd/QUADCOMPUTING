export interface BillLine {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
}

/** Turns whatever shape the order API sent into plain lines, so a missing field can never print NaN on a bill. */
export function normalizeBillItems(sent: any[] | undefined | null): BillLine[] {
  return (sent || []).map((it: any, idx: number) => {
    const quantity = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);
    const unitPrice = Number(it.price ?? it.unit_price ?? it.total_item_price ?? 0) || 0;
    return {
      id: it.id || `bill_item_${idx}`,
      itemName: it.item_name || it.name || it.title || 'Curated Dish',
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
      notes: it.notes || null,
    };
  });
}
