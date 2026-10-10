import { businessDateString } from '@/lib/utils/business-day';
import type { InventoryOverview, StockItemView, StockStatus } from './inventory.types';

const DAY_MS = 86_400_000;
const r2 = (n: number) => Math.round(n * 100) / 100, r3 = (n: number) => Math.round(n * 1000) / 1000;
const num = (v: unknown) => Number(v) || 0;

export function stockStatus(stock: number, reorderAt: number): StockStatus {
  if (stock < 0) return 'negative';
  if (stock === 0) return 'out';
  return stock <= reorderAt ? 'low' : 'ok';
}

/** Order up to two weeks of use, or twice the reorder level, whichever is more. */
export function suggestedOrder(stock: number, reorderAt: number, dailyUse: number): number {
  if (stock > reorderAt) return 0;
  const target = Math.max(reorderAt * 2, dailyUse * 14);
  return Math.max(0, r3(target - stock));
}

interface Input { items: any[]; logs: any[]; recipes: any[]; dishCount: number; now?: Date }

/** Each stock item with its use, cover and value, and the venue's totals. */
export function buildOverview({ items, logs, recipes, dishCount, now = new Date() }: Input): InventoryOverview {
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const today = businessDateString(now);
  const used = new Map<string, number>(), recipeCount = new Map<string, number>(), last = new Map<string, string>();
  const suppliers = new Set<string>();
  let usedToday = 0, used7 = 0, wasted7 = 0, bought30 = 0, countLoss30 = 0;

  for (const l of logs) {
    const at = Date.parse(l.logged_at);
    const type = String(l.action_type || '').toUpperCase();
    const cost = num(l.total_cost);
    if (!last.has(l.item_id) || l.logged_at > last.get(l.item_id)!) last.set(l.item_id, l.logged_at);
    if (type === 'CONSUMPTION') {
      if (at >= weekAgo) { used.set(l.item_id, (used.get(l.item_id) || 0) - num(l.change_amount)); used7 += cost; }
      if (businessDateString(new Date(at)) === today) usedToday += cost;
    }
    if (type === 'WASTAGE' && at >= weekAgo) wasted7 += cost;
    if (type === 'PURCHASE') { bought30 += cost; if (l.supplier_name) suppliers.add(String(l.supplier_name).trim().toLowerCase()); }
    if ((type === 'COUNT' || type.startsWith('MANUAL_ADJUST')) && num(l.change_amount) < 0) countLoss30 += cost;
  }
  for (const r of recipes) recipeCount.set(r.raw_item_id, (recipeCount.get(r.raw_item_id) || 0) + 1);

  const views: StockItemView[] = items.map((it) => {
    const stock = num(it.current_stock);
    const reorderAt = num(it.threshold);
    const daily = r3((used.get(it.id) || 0) / 7);
    if (it.supplier_name) suppliers.add(String(it.supplier_name).trim().toLowerCase());
    return {
      id: it.id, item_name: it.item_name, category: it.category || 'Raw stock', unit: it.unit || 'kg',
      current_stock: stock, threshold: reorderAt, cost_per_unit: num(it.cost_per_unit),
      supplier_name: it.supplier_name || null, is_critical: Boolean(it.is_critical), updated_at: it.updated_at,
      status: stockStatus(stock, reorderAt),
      value: r2(Math.max(stock, 0) * num(it.cost_per_unit)),
      daily_use: daily,
      days_cover: daily > 0 ? Math.max(0, Math.round((stock / daily) * 10) / 10) : null,
      suggested_order: suggestedOrder(stock, reorderAt, daily),
      recipes: recipeCount.get(it.id) || 0,
      last_movement_at: last.get(it.id) || null,
    };
  });

  const dishesLinked = new Set(recipes.map((r) => r.catalog_item_id)).size;
  return {
    items: views,
    summary: {
      stock_value: r2(views.reduce((s, v) => s + v.value, 0)),
      item_count: views.length,
      attention_count: views.filter((v) => v.status !== 'ok').length,
      negative_count: views.filter((v) => v.status === 'negative').length,
      used_today_value: r2(usedToday), used_7d_value: r2(used7), wastage_7d_value: r2(wasted7),
      purchases_30d_value: r2(bought30), count_loss_30d_value: r2(countLoss30),
      supplier_count: suppliers.size,
      recipe_coverage: { linked: Math.min(dishesLinked, dishCount), total: dishCount },
    },
  };
}
