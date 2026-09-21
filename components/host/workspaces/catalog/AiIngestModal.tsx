'use client';

import { useState, useRef } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

interface AiIngestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AiIngestModal({ onClose, onSuccess }: AiIngestModalProps) {
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const primaryBranch = propertyBranches[0];

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip out the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractMenu = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError('');

    try {
      const base64Image = await convertToBase64(file);
      const res = await fetch('/api/host/catalog/ai-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Image,
          mimeType: file.type 
        })
      });

      if (!res.ok) {
        throw new Error('Failed to process image via Vision AI.');
      }

      const data = await res.json();
      setExtractedItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Error parsing image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!primaryBranch) {
      setError("No valid location/business found. Please finish onboarding.");
      return;
    }

    if (extractedItems.length === 0) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/host/catalog/bulk-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: extractedItems })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to bulk insert items.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during bulk insert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-6">
          <div>
            <h2 className="font-serif text-2xl font-medium text-black">⚡ AI Menu Ingest</h2>
            <p className="mt-1 text-sm text-zinc-500">Upload a photo of your physical menu to auto-extract your items.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-black self-start">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {extractedItems.length === 0 ? (
            <div className="space-y-6">
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-12 transition-colors hover:bg-zinc-100 ${file ? 'border-black bg-zinc-100' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                
                {file ? (
                  <div className="text-center">
                    <span className="text-4xl mb-4 block">📸</span>
                    <p className="font-medium text-black">{file.name}</p>
                    <p className="text-sm text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-4xl mb-4 block">📥</span>
                    <p className="font-medium text-black">Drag & drop your menu photo here</p>
                    <p className="mt-1 text-sm text-zinc-500">JPEG or PNG up to 10MB</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={(e) => { e.stopPropagation(); extractMenu(); }}
                  disabled={!file || isProcessing}
                  className="rounded-xl bg-zinc-950 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Extracting items via Vision AI...
                    </span>
                  ) : (
                    'Run AI Extraction'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="font-serif text-lg font-medium">Extracted Menu Items ({extractedItems.length})</h3>
              <div className="rounded-2xl border border-zinc-200 overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-600">
                  <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 w-32">Category</th>
                      <th className="px-4 py-3 w-24">Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {extractedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-2">
                          <input 
                            value={item.name} 
                            onChange={(e) => {
                              const newItems = [...extractedItems];
                              newItems[idx].name = e.target.value;
                              setExtractedItems(newItems);
                            }}
                            className="w-full bg-transparent px-2 py-1 font-medium text-black focus:outline-none focus:ring-1 focus:ring-black rounded"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input 
                            value={item.description || ''} 
                            onChange={(e) => {
                              const newItems = [...extractedItems];
                              newItems[idx].description = e.target.value;
                              setExtractedItems(newItems);
                            }}
                            className="w-full bg-transparent px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black rounded"
                            placeholder="Optional description"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input 
                            value={item.category} 
                            onChange={(e) => {
                              const newItems = [...extractedItems];
                              newItems[idx].category = e.target.value;
                              setExtractedItems(newItems);
                            }}
                            className="w-full bg-transparent px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black rounded"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input 
                            type="number"
                            value={item.price} 
                            onChange={(e) => {
                              const newItems = [...extractedItems];
                              newItems[idx].price = e.target.value;
                              setExtractedItems(newItems);
                            }}
                            className="w-full bg-transparent px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-black rounded"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50 px-8 py-5">
          <button type="button" onClick={onClose} className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-200">
            Cancel
          </button>
          {extractedItems.length > 0 && (
            <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-zinc-950 px-8 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-black disabled:opacity-50">
              {isSubmitting ? 'Committing...' : 'Confirm & Bulk Ingest'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
