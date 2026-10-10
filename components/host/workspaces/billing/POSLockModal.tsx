'use client';

import { useState } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

interface Props {
  onUnlock: (staff: { id: string; name: string; role: string }) => void;
  onCancel?: () => void;
}

export function POSLockModal({ onUnlock, onCancel }: Props) {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [isIdentitySelection, setIsIdentitySelection] = useState(false);

  const handleKeyPress = (key: string) => {
    if (isVerifying) return;
    if (pin.length < 4) {
      setPin(prev => prev + key);
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isVerifying) return;
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('Enter 4-digit PIN');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/host/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pinCode: pin
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.requireIdentitySelection) {
          setStaffList(data.staffList);
          setIsIdentitySelection(true);
        } else {
          onUnlock(data.staff);
        }
      } else {
        setError(data.error || 'Invalid PIN');
        setPin('');
      }
    } catch (err) {
      setError('Network error. Try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  if (isIdentitySelection) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="w-full max-w-sm rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-500 border border-white/20">
          <div className="text-center mb-6">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-black">Select Identity</h2>
            <p className="mt-1.5 text-[13px] text-zinc-500">Who is operating the terminal?</p>
          </div>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto no-scrollbar mb-4">
            {staffList.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-4">No active staff found.</p>
            ) : (
              staffList.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => onUnlock(staff)}
                  className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-4 transition-all hover:bg-zinc-50 active:scale-[0.98]"
                >
                  <span className="font-semibold text-black">{staff.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{staff.role}</span>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => {
              setIsIdentitySelection(false);
              setPin('');
            }}
            className="w-full rounded-2xl bg-zinc-100 py-3.5 text-[13px] font-bold uppercase tracking-wider text-black transition-colors hover:bg-zinc-200"
          >
            Cancel & Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-500 border border-white/20">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100/80 text-black shadow-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-black">Terminal Locked</h2>
          <p className="mt-1.5 text-[13px] text-zinc-500">Enter your 4-digit POS PIN to continue</p>
        </div>

        {/* PIN Display */}
        <div className="mb-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index} 
              className={`flex h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                pin.length > index ? 'bg-black scale-110 shadow-sm' : 'bg-zinc-200/80'
              }`} 
            />
          ))}
        </div>

        {error && (
          <p className="mb-4 text-center text-xs font-semibold text-red-500 animate-in shake">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {numpadKeys.map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'C') handleClear();
                else if (key === '⌫') handleBackspace();
                else handleKeyPress(key);
              }}
              className="flex h-14 items-center justify-center rounded-2xl bg-zinc-50/80 text-xl font-medium text-black transition-all hover:bg-zinc-200/80 hover:scale-[0.98] active:bg-zinc-300"
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={pin.length !== 4 || isVerifying}
          className="w-full rounded-2xl bg-black py-3.5 text-[13px] font-bold uppercase tracking-wider text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isVerifying && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          {isVerifying ? 'Verifying...' : 'Unlock Terminal'}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-2 w-full rounded-2xl bg-transparent py-3 text-[12px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:text-black hover:bg-zinc-50"
          >
            Cancel & Go Back
          </button>
        )}
      </div>
    </div>
  );
}
