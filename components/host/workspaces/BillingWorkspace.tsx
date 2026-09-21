'use client';

import { useState, useEffect } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { InvoicePreviewModal, InvoiceData } from './billing/InvoicePreviewModal';

export function BillingWorkspace() {
  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);
  const activeItems = serviceCatalog.filter(i => i.status !== 'archived');
  
  // View State
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // POS State
  const [selectedItems, setSelectedItems] = useState<Array<{ id: string, name: string, price: number, qty: number }>>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [gstEnabled, setGstEnabled] = useState(true);
  
  // Dual-mode discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountInputValue, setDiscountInputValue] = useState('');

  const [invoicePreview, setInvoicePreview] = useState<InvoiceData | null>(null);

  // Calculation Pipeline
  const subtotal = selectedItems.reduce((acc, item) => acc + (item.price * item.qty), 0) + (Number(customAmount) || 0);
  const discountValue = Number(discountInputValue) || 0;
  
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discountValue) / 100 
    : Math.min(subtotal, discountValue);
    
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = gstEnabled ? taxableAmount * 0.18 : 0;
  const grandTotal = taxableAmount + gstAmount;

  function addItem(catalogId: string) {
    const item = activeItems.find(i => i.id === catalogId);
    if (!item) return;
    
    const price = item.kind === 'food_beverage' ? item.price.amountMinor : item.nightlyRate.amountMinor;
    
    setSelectedItems(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { id: item.id, name: item.name, price, qty: 1 }];
    });
  }

  function removeItem(id: string) {
    setSelectedItems(prev => prev.filter(p => p.id !== id));
  }

  function handleGenerateBill() {
    if (selectedItems.length === 0 && !customAmount) return;
    
    const invoice: InvoiceData = {
      items: [...selectedItems],
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxAmount: gstAmount,
      grandTotal,
    };
    if (Number(customAmount) > 0) {
      invoice.items.push({ id: 'custom', name: 'Custom Entry', price: Number(customAmount), qty: 1 });
    }
    setInvoicePreview(invoice);
  }

  function handleOrderSuccess() {
    setInvoicePreview(null);
    setSelectedItems([]);
    setCustomAmount('');
    setDiscountInputValue('');
    alert('Bill saved and finalized successfully.');
    if (activeTab === 'history') {
      fetchOrderHistory();
    }
  }

  const fetchOrderHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/host/orders/history');
      if (res.ok) {
        const data = await res.json();
        setOrderHistory(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchOrderHistory();
    }
  }, [activeTab]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header & Tabs */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900">Billing & POS Ecosystem</h2>
          <p className="mt-2 text-sm text-zinc-500">Calculate and generate itemized digital receipts with dual-mode discounts.</p>
        </div>
        <div className="flex w-full items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 sm:w-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all sm:flex-none ${
              activeTab === 'pos' ? 'bg-zinc-100 text-black shadow-sm' : 'text-zinc-400 hover:text-black'
            }`}
          >
            New POS Order
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all sm:flex-none ${
              activeTab === 'history' ? 'bg-zinc-100 text-black shadow-sm' : 'text-zinc-400 hover:text-black'
            }`}
          >
            Order History
          </button>
        </div>
      </div>

      {activeTab === 'pos' && (
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-12 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Checkout Controls */}
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-8 shadow-sm">
              <h3 className="font-serif text-xl font-medium text-black">Quick Add Item</h3>
              <div className="mt-6 flex flex-wrap gap-2">
                {activeItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item.id)}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition-colors hover:border-black hover:bg-white"
                  >
                    <p className="font-medium text-black">{item.name}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      ₹{item.kind === 'food_beverage' ? item.price.amountMinor : item.nightlyRate.amountMinor}
                    </p>
                  </button>
                ))}
                {activeItems.length === 0 && (
                  <p className="text-sm text-zinc-400">No active catalog items available.</p>
                )}
              </div>
              
              <hr className="my-8 border-zinc-100" />
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Custom Entry (₹)</label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 font-mono text-sm text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Discount</label>
                    <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                      <button onClick={() => setDiscountType('percentage')} className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors ${discountType === 'percentage' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}>%</button>
                      <button onClick={() => setDiscountType('flat')} className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors ${discountType === 'flat' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}>₹</button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-zinc-400 font-mono text-sm">{discountType === 'flat' ? '₹' : '%'}</span>
                    <input
                      type="number"
                      value={discountInputValue}
                      onChange={(e) => setDiscountInputValue(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-4 py-3.5 font-mono text-sm text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div>
                  <p className="font-medium text-black">Apply 18% GST</p>
                  <p className="text-xs text-zinc-500">Automatically calculate tax post-discount.</p>
                </div>
                <button
                  onClick={() => setGstEnabled(!gstEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${gstEnabled ? 'bg-black' : 'bg-zinc-300'}`}
                >
                  <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${gstEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Digital Receipt */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 rounded-2xl sm:rounded-3xl bg-zinc-950 p-4 sm:p-8 text-white shadow-2xl">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Digital Receipt</h3>
              
              <div className="mt-8 min-h-[160px] space-y-4 text-sm text-zinc-300">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between group">
                    <div className="flex gap-3">
                      <span className="font-mono text-zinc-500">{item.qty}x</span>
                      <span className="text-white">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{(item.price * item.qty).toFixed(2)}</span>
                      <button onClick={() => removeItem(item.id)} className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity">✕</button>
                    </div>
                  </div>
                ))}
                {Number(customAmount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white">Custom Entry</span>
                    <span className="font-mono">{Number(customAmount).toFixed(2)}</span>
                  </div>
                )}
                {selectedItems.length === 0 && !customAmount && (
                  <p className="text-center text-zinc-600">No items added to bill.</p>
                )}
              </div>

              <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-mono">{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : `Flat ₹`})</span>
                    <span className="font-mono">-{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {gstEnabled && (
                  <div className="flex justify-between text-zinc-400">
                    <span>GST (18%)</span>
                    <span className="font-mono">{gstAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between border-t border-white/10 pt-4 font-serif text-2xl sm:text-3xl text-white">
                  <span>Total</span>
                  <span className="font-mono tracking-tight">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={handleGenerateBill}
                disabled={selectedItems.length === 0 && !customAmount}
                className="mt-8 w-full rounded-xl bg-white py-4 text-[11px] font-bold uppercase tracking-wider text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                Generate & Finalize Bill
              </button>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden min-h-[300px] sm:min-h-[400px] animate-in fade-in zoom-in-95 duration-300">
          {isLoadingHistory ? (
            <div className="flex h-[400px] items-center justify-center">
              <svg className="h-6 w-6 animate-spin text-zinc-300" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
            </div>
          ) : orderHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Subtotal</th>
                    <th className="px-6 py-4">Discount</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orderHistory.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-6 py-4 font-mono text-xs text-black">
                        {order.id.split('-')[0].toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        ₹{Number(order.subtotal).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono text-red-500">
                        {Number(order.discount_amount) > 0 ? `-₹${Number(order.discount_amount).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-black">
                        ₹{Number(order.grand_total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setInvoicePreview({
                            items: order.items,
                            subtotal: Number(order.subtotal),
                            discountType: order.discount_type,
                            discountValue: Number(order.discount_value),
                            discountAmount: Number(order.discount_amount),
                            taxAmount: Number(order.tax_amount),
                            grandTotal: Number(order.grand_total),
                            isReadOnly: true
                          })}
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
              <h3 className="font-serif text-xl text-black">No past orders</h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">Orders finalized in the POS system will be permanently saved here.</p>
            </div>
          )}
        </div>
      )}

      {invoicePreview && (
        <InvoicePreviewModal 
          invoice={invoicePreview} 
          onClose={() => setInvoicePreview(null)} 
          onSuccess={handleOrderSuccess} 
        />
      )}
    </div>
  );
}
