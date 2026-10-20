// lib/services/guest-order/guest-safe-order.util.ts

/**
 * The order as a guest may see it. The customer's name and phone are never sent to an anonymous caller, and the
 * idempotency key is a replay credential: anyone holding it could resubmit and read the stored order back.
 */
export function guestSafeOrder<T extends Record<string, any> | null>(order: T): T {
  if (!order) return order;
  const { customer_name: _name, customer_phone: _phone, idempotency_key: _key, ...rest } = order;
  return rest as T;
}
