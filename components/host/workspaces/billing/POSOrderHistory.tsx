import { useState } from 'react';
import type { InvoiceData } from './InvoicePreviewModal';
import { Bed, UtensilsCrossed } from 'lucide-react';

interface Props {
  isLoadingHistory: boolean;
  orderHistory: any[];
  setInvoicePreview: (invoice: InvoiceData) => void;
}

export function POSOrderHistory({ isLoadingHistory, orderHistory, setInvoicePreview }: Props) {
  const [filterType, setFilterType] = useState<'ALL' | 'DINE_IN' | 'ROOM_SERVICE'>('ALL');

  const filteredOrders = orderHistory.filter((order) => {
    if (filterType === 'ROOM_SERVICE') return Boolean(order.room_id);
    if (filterType === 'DINE_IN') return !order.room_id;
    return true;
  });

  const roomServiceCount = orderHistory.filter((o) => Boolean(o.room_id)).length;

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden min-h-[300px] sm:min-h-[400px] animate-in fade-in zoom-in-95 duration-300">
      
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/50 px-6 py-3.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterType('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            All Orders ({orderHistory.length})
          </button>
          <button
            onClick={() => setFilterType('DINE_IN')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filterType === 'DINE_IN'
                ? 'bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            Dine-In / Counter
          </button>
          <button
            onClick={() => setFilterType('ROOM_SERVICE')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filterType === 'ROOM_SERVICE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Bed className="h-3.5 w-3.5" />
            Room Service ({roomServiceCount})
          </button>
        </div>
      </div>

      {isLoadingHistory ? (
        <div className="flex h-[400px] items-center justify-center">
          <svg className="h-6 w-6 animate-spin text-zinc-300" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              className="opacity-75"
            />
          </svg>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Subtotal</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-zinc-50/50">
                  <td className="px-6 py-4 font-mono text-xs text-black">
                    {order.id.split('-')[0].toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    {order.room_id ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                        <Bed className="h-3 w-3" />
                        {order.table_number?.toUpperCase().startsWith('ROOM') ? order.table_number : `Room ${order.table_number || ''}`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                        <UtensilsCrossed className="h-3 w-3 text-zinc-400" />
                        {order.table_number || 'Takeaway'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-mono">
                    ₹{Number(order.subtotal).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-mono text-red-500">
                    {Number(order.discount_amount) > 0
                      ? `-₹${Number(order.discount_amount).toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-black">
                    ₹{Number(order.grand_total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() =>
                        setInvoicePreview({
                          id: order.id,
                          created_at: order.created_at,
                          guest_name: order.customer_name && order.customer_name !== 'Guest' ? order.customer_name : undefined,
                          guest_phone: order.customer_phone || undefined,
                          table_number: order.table_number || undefined,
                          payment_method: order.payment_method || undefined,
                          items: order.items,
                          subtotal: Number(order.subtotal),
                          discountType: order.discount_type,
                          discountValue: Number(order.discount_value),
                          discountAmount: Number(order.discount_amount),
                          taxAmount: Number(order.tax_amount),
                          grandTotal: Number(order.grand_total),
                          isReadOnly: true,
                        })
                      }
                      className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-black transition-colors"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <h3 className="font-serif text-xl text-black">No orders found</h3>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            {filterType === 'ROOM_SERVICE' 
              ? 'No room service orders have been recorded yet.'
              : 'Orders finalized in the POS system will be permanently saved here.'}
          </p>
        </div>
      )}
    </div>
  );
}
