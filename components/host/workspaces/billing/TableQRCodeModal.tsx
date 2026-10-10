'use client';

import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import type { RestaurantTable } from './hooks/usePOSTables';
import { printTablePlacard } from './utils/printTablePlacard';

interface Props {
  tables: RestaurantTable[];
  selectedTableId?: string | null;
  cafeId?: string;
  onClose: () => void;
}

export function TableQRCodeModal({ tables, selectedTableId, cafeId = '', onClose }: Props) {
  const [mode, setMode] = useState<'universal' | 'individual'>('universal');
  const [activeTableId, setActiveTableId] = useState<string>(
    selectedTableId || (tables.length > 0 ? tables[0].id : '')
  );
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const qrRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const activeTable = tables.find((t) => t.id === activeTableId) || tables[0];
  const cafeParam = cafeId ? `&cafe_id=${encodeURIComponent(cafeId)}` : '';
  const universalQrUrl = cafeId ? `${origin || 'https://quadvenue.com'}/menu?cafe_id=${encodeURIComponent(cafeId)}` : `${origin || 'https://quadvenue.com'}/menu`;
  const individualQrUrl = `${origin || 'https://quadvenue.com'}/menu?table=${encodeURIComponent(
    activeTable ? activeTable.table_number : 'T-01'
  )}${cafeParam}`;

  const activeUrl = mode === 'universal' ? universalQrUrl : individualQrUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    if (!qrRef.current) return;
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quad-qr-${mode === 'universal' ? 'universal' : activeTable?.table_number || 'table'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    printTablePlacard(qrRef.current, activeTable?.table_number || 'T-01', mode);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/20 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-sm animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight">QR Code Generator</h2>
              <p className="text-xs text-neutral-600 mt-0.5">Instant ordering for restaurant & cafe tables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close QR code generator"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-4">
          <button
            onClick={() => setMode('universal')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'universal'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
            <span>Universal QR</span>
          </button>

          <button
            onClick={() => setMode('individual')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              mode === 'individual'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>Table-Specific Placards</span>
          </button>
        </div>

        {/* Content Layout */}
        <div className="p-3 flex flex-col items-center justify-center space-y-2">
          {mode === 'individual' && tables.length > 0 && (
            <div className="w-full max-w-md space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block text-center">
                Select Table Placard
              </span>
              <div className="flex flex-wrap justify-center gap-1.5 max-h-24 overflow-y-auto p-1 custom-scrollbar">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setActiveTableId(table.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      table.id === activeTableId
                          ? 'border border-neutral-300 bg-neutral-100 text-neutral-900 shadow-sm'
                          : 'border border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {table.table_number}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Minimal Placard Preview */}
          <div className="w-full max-w-[190px] rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-center shadow-sm">
            <div className="text-[9px] uppercase tracking-[0.25em] text-neutral-500 font-bold mb-1">
              QUAD HOSPITALITY
            </div>

            <div className="inline-block px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-[9px] font-bold tracking-wider text-neutral-800 uppercase mb-2">
              {mode === 'universal' ? 'UNIVERSAL GUEST QR' : activeTable?.table_number || 'TABLE'}
            </div>

            <div className="mx-auto inline-block p-1 border border-neutral-200 rounded-lg bg-white mb-2">
              <QRCodeSVG ref={qrRef} value={activeUrl} size={96} level="H" includeMargin={false} />
            </div>
          </div>

          {/* URL Display */}
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-1.5 text-center">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-0.5">
              QR Destination URL
            </span>
            <p className="text-[10px] font-mono text-neutral-600 break-all select-all">{activeUrl}</p>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 z-10 flex w-full max-w-md flex-wrap items-center justify-center gap-2 border-t border-neutral-200 bg-white/95 py-2 pt-2 backdrop-blur-sm">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-[11px] font-semibold text-neutral-800 transition-colors hover:bg-neutral-200 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Go Back</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Stand Placard</span>
            </button>

            <button
              onClick={handleDownloadSVG}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-[11px] font-bold text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-neutral-400" />
              <span>Download SVG</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-[11px] font-bold text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-neutral-500" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <a
              href={activeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors ml-1"
            >
              <span>Preview</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
