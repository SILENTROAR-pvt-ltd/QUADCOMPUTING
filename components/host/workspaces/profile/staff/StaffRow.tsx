'use client';

import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { STAFF_ROLES, type StaffRole } from '@/lib/services/staff-auth/staff-roles';
import { ROLE_LABEL } from './AddStaffForm';
import { StaffEditPanel } from './StaffEditPanel';
import type { StaffMember } from './useStaffAccess';

interface StaffRowProps {
  member: StaffMember;
  onChange: (id: string, patch: { name?: string; role?: StaffRole; pin?: string; active?: boolean }) => Promise<string | null>;
  onRemove: (id: string) => Promise<string | null>;
}

const quiet = 'inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 px-2.5 text-xs font-semibold';

/** One staff member: edit their name or PIN, change their role, switch their access on or off, or remove them. */
export function StaffRow({ member, onChange, onRemove }: StaffRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (patch: Parameters<StaffRowProps['onChange']>[1]) => {
    setError(null);
    const problem = await onChange(member.id, patch);
    if (problem) setError(problem); else setEditing(false);
  };
  const remove = async () => {
    setError(null);
    const problem = await onRemove(member.id);
    if (problem) { setError(problem); setConfirming(false); }
  };

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${member.active ? 'text-neutral-950' : 'text-neutral-400 line-through'}`}>{member.name}</p>
          <p className="text-[11px] text-neutral-500">{member.hasPin ? 'PIN set' : 'No PIN yet: cannot sign in'}{member.lastLoginAt ? ` · last in ${new Date(member.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</p>
        </div>
        <select value={member.role ?? ''} onChange={(e) => void change({ role: e.target.value as StaffRole })} aria-label={`Role of ${member.name}`}
          className="h-10 cursor-pointer rounded-lg border border-neutral-200 bg-white px-2 text-xs font-medium">
          {member.role === null && <option value="" disabled>Choose a role</option>}
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button type="button" onClick={() => { setEditing((v) => !v); setConfirming(false); }} aria-label={`Edit ${member.name}`} aria-expanded={editing} className={`${quiet} text-neutral-700`}>
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </button>
        <button type="button" onClick={() => void change({ active: !member.active })}
          className={`h-10 cursor-pointer rounded-lg px-3 text-xs font-semibold ${member.active ? 'border border-neutral-200 text-neutral-700' : 'bg-emerald-700 text-white'}`}>
          {member.active ? 'Switch off' : 'Switch on'}
        </button>
        <button type="button" onClick={() => { setConfirming(true); setEditing(false); }} aria-label={`Delete ${member.name}`} className={`${quiet} text-rose-700`}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
        </button>
      </div>
      {editing && <StaffEditPanel name={member.name} hasPin={member.hasPin} onSave={(p) => change(p)} onCancel={() => setEditing(false)} />}
      {confirming && (
        <div role="alertdialog" aria-label={`Delete ${member.name}?`} className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs leading-relaxed text-rose-900">Delete <strong>{member.name}</strong>? They can no longer sign in. Their pay and past orders stay on record.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void remove()} className="h-10 cursor-pointer rounded-lg bg-rose-700 px-4 text-xs font-semibold text-white">Yes, delete</button>
            <button type="button" onClick={() => setConfirming(false)} className="h-10 cursor-pointer rounded-lg px-3 text-xs font-semibold text-neutral-600 hover:bg-white">Keep</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
    </li>
  );
}
