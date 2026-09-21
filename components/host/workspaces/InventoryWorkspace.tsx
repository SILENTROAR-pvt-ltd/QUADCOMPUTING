'use client';

import { useState, useEffect } from 'react';

// Interfaces for Raw Inventory
export interface RawInventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  current_stock: number;
  threshold: number;
  cost_per_unit: number;
  updated_at: string;
}

export function InventoryWorkspace() {
  const [items, setItems] = useState<RawInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RawInventoryItem>>({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/host/inventory/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Metrics
  const totalValue = items.reduce((acc, item) => acc + (item.current_stock * item.cost_per_unit), 0);
  const lowStockCount = items.filter(i => i.current_stock <= i.threshold).length;
  const activeSuppliers = 3; // Mocked active suppliers

  // OCR Upload Logic
  const handleSimulateOcr = async () => {
    setIsUploadingBill(true);
    try {
      const res = await fetch('/api/host/inventory/ocr-ingest', { method: 'POST' });
      if (res.ok) {
        await fetchItems();
        alert('Bill processed successfully! Items added to inventory.');
        setDragActive(false);
      }
    } catch (e) {
      alert('Failed to process bill');
    } finally {
      setIsUploadingBill(false);
    }
  };

  // Inline Edits
  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch('/api/host/inventory/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm })
      });
      if (res.ok) {
        const { item } = await res.json();
        setItems(items.map(i => i.id === id ? item : i));
        setEditingId(null);
      }
    } catch (e) {
      alert('Failed to update item');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900">Raw Inventory & Supply</h2>
          <p className="mt-1 text-sm text-zinc-500">Manage raw ingredients, process supplier bills, and track stock valuation.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            onClick={() => setDragActive(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-900 shadow-sm transition-all hover:bg-zinc-50"
          >
            Upload Bill (OCR)
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-zinc-800"
          >
            + Add Raw Item
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Raw Value</h3>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-medium tracking-tight text-black">₹{totalValue.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Low Stock Alerts</h3>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-medium tracking-tight text-red-600">{lowStockCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Suppliers</h3>
          <p className="mt-2 font-mono text-2xl sm:text-3xl font-medium tracking-tight text-black">{activeSuppliers}</p>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden min-h-[300px] sm:min-h-[400px]">
        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <svg className="h-6 w-6 animate-spin text-zinc-300" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
          </div>
        ) : items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Item & Category</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">Current Stock</th>
                  <th className="px-6 py-4">Cost/Unit (₹)</th>
                  <th className="px-6 py-4">Threshold</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-black">{item.item_name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs uppercase tracking-wider">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {isEditing ? (
                          <input type="number" className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-black" value={editForm.current_stock ?? item.current_stock} onChange={(e) => setEditForm({ ...editForm, current_stock: Number(e.target.value) })} />
                        ) : (
                          <span className={item.current_stock <= item.threshold ? 'text-red-600 font-bold' : 'text-black'}>{item.current_stock}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-black">
                        {isEditing ? (
                          <input type="number" className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-black" value={editForm.cost_per_unit ?? item.cost_per_unit} onChange={(e) => setEditForm({ ...editForm, cost_per_unit: Number(e.target.value) })} />
                        ) : (
                          <span>{item.cost_per_unit.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-500">
                        {isEditing ? (
                          <input type="number" className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-black" value={editForm.threshold ?? item.threshold} onChange={(e) => setEditForm({ ...editForm, threshold: Number(e.target.value) })} />
                        ) : (
                          item.threshold
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-black">Cancel</button>
                            <button onClick={() => handleSaveEdit(item.id)} className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800">Save</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingId(item.id); setEditForm({ current_stock: item.current_stock, cost_per_unit: item.cost_per_unit, threshold: item.threshold }); }} className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-black">
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <h3 className="font-serif text-xl text-black">No raw inventory tracked</h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">Upload a supplier bill to auto-ingest items, or add raw stock manually.</p>
          </div>
        )}
      </div>

      {/* Upload OCR Modal */}
      {dragActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <h2 className="font-serif text-2xl font-medium text-black">Upload Supplier Bill</h2>
            <p className="mt-2 text-sm text-zinc-500">Drag and drop an invoice image or PDF to instantly extract items, prices, and quantities via OCR.</p>
            
            <div className="mt-8 border-2 border-dashed border-zinc-200 rounded-2xl p-12 bg-zinc-50 flex flex-col items-center justify-center transition-colors hover:border-black hover:bg-zinc-100">
              <svg className="w-10 h-10 text-zinc-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <p className="text-sm font-medium text-black">Drop invoice file here</p>
              <p className="text-xs text-zinc-500 mt-1">Supported: JPG, PNG, PDF</p>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setDragActive(false)} className="rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-100">Cancel</button>
              <button onClick={handleSimulateOcr} disabled={isUploadingBill} className="rounded-xl bg-zinc-950 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2">
                {isUploadingBill && <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>}
                {isUploadingBill ? 'Extracting via AI...' : 'Simulate OCR Ingest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {isAddModalOpen && <AddRawItemModal onClose={() => setIsAddModalOpen(false)} onSuccess={fetchItems} />}
    </div>
  );
}

// Subcomponent
function AddRawItemModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ itemName: '', category: 'Raw Stock', unit: 'kg', currentStock: '0', costPerUnit: '0', threshold: '5' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/host/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          currentStock: Number(formData.currentStock),
          costPerUnit: Number(formData.costPerUnit),
          threshold: Number(formData.threshold)
        })
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      alert('Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black";
  const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
          <h2 className="font-serif text-xl font-medium text-black">New Raw Stock</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-black">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div>
            <label className={labelClass}>Item Name</label>
            <input required type="text" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} className={inputClass} placeholder="e.g. Tomatoes" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className={inputClass}>
                <option value="kg">kg (Kilograms)</option>
                <option value="ltr">ltr (Liters)</option>
                <option value="pcs">pcs (Pieces)</option>
                <option value="box">box (Boxes)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Initial Stock</label>
              <input required type="number" step="0.01" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cost Per Unit (₹)</label>
              <input required type="number" step="0.01" value={formData.costPerUnit} onChange={e => setFormData({...formData, costPerUnit: e.target.value})} className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-100">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-zinc-950 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
