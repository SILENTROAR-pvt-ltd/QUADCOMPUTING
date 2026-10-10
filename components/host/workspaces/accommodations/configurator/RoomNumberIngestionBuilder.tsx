'use client';

import React, { useState } from 'react';
import { Bed, Plus, X } from 'lucide-react';

interface Props {
  manualRoomNumbers: string[];
  setManualRoomNumbers: React.Dispatch<React.SetStateAction<string[]>>;
}

export function RoomNumberIngestionBuilder({
  manualRoomNumbers,
  setManualRoomNumbers
}: Props) {
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [seqPrefix, setSeqPrefix] = useState('10');
  const [seqStart, setSeqStart] = useState('1');
  const [seqCount, setSeqCount] = useState('4');
  const [showSeqHelper, setShowSeqHelper] = useState(false);

  const handleAddManualRoomNumbers = () => {
    const trimmed = roomNumberInput.trim();
    if (!trimmed) return;
    const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
    setManualRoomNumbers(prev => {
      const combined = [...prev];
      for (const p of parts) {
        if (!combined.includes(p)) combined.push(p);
      }
      return combined;
    });
    setRoomNumberInput('');
  };

  const handleGenerateSequence = () => {
    const count = Math.max(1, parseInt(seqCount, 10) || 1);
    const start = parseInt(seqStart, 10) || 1;
    const generated: string[] = [];
    for (let i = 0; i < count; i++) {
      generated.push(`${seqPrefix}${start + i}`);
    }
    setManualRoomNumbers(generated);
    setShowSeqHelper(false);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Bed className="h-4 w-4 text-zinc-950" />
            Manual Room Number Ingestion
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">
            Enter each exact room/unit number to store into database (e.g. 101, 102, Villa-A).
          </p>
        </div>
        <span className="self-start sm:self-auto rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 font-mono text-xs font-bold text-zinc-900 shadow-xs">
          {manualRoomNumbers.length} Rooms Ingested
        </span>
      </div>

      {/* Chips of Configured Room Numbers */}
      <div className="flex flex-wrap gap-2 min-h-12 items-center p-3 rounded-xl border border-zinc-200 bg-white">
        {manualRoomNumbers.length === 0 ? (
          <span className="text-xs text-zinc-400 italic">No room numbers specified. Enter below or use the auto sequence generator.</span>
        ) : (
          manualRoomNumbers.map((num, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs font-bold text-zinc-800 shadow-xs"
            >
              Room {num}
              <button
                type="button"
                onClick={() => setManualRoomNumbers(prev => prev.filter((_, i) => i !== idx))}
                className="text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Remove room"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Entry Row: Single or Comma Separated */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Type room number(s) e.g. 105 or 105, 106, 107..."
            value={roomNumberInput}
            onChange={(e) => setRoomNumberInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddManualRoomNumbers();
              }
            }}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 outline-none font-mono"
          />
        </div>
        <button
          type="button"
          onClick={handleAddManualRoomNumbers}
          disabled={!roomNumberInput.trim()}
          className="rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 px-4 py-2.5 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Room
        </button>
        <button
          type="button"
          onClick={() => setShowSeqHelper(!showSeqHelper)}
          className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 px-3.5 py-2.5 text-xs font-bold text-zinc-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          {showSeqHelper ? 'Hide Helper' : 'Sequence Helper'}
        </button>
      </div>

      {/* Quick Auto Sequence Helper */}
      {showSeqHelper && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 space-y-3 animate-in fade-in">
          <p className="text-xs font-bold text-zinc-900">Auto Generate Sequential Room Numbers</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">Prefix</label>
              <input
                type="text"
                value={seqPrefix}
                onChange={(e) => setSeqPrefix(e.target.value)}
                placeholder="e.g. 10, Villa-"
                className="w-full rounded-lg border border-zinc-200 p-2 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">Start Number</label>
              <input
                type="number"
                value={seqStart}
                onChange={(e) => setSeqStart(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 p-2 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">Count</label>
              <input
                type="number"
                value={seqCount}
                onChange={(e) => setSeqCount(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 p-2 text-xs font-mono font-bold"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleGenerateSequence}
              className="rounded-lg bg-zinc-900 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-zinc-800 cursor-pointer"
            >
              Generate & Apply Sequence
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
