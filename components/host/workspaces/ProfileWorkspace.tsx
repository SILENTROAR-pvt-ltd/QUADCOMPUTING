'use client';

import { useState, useEffect } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { CategoryHandled } from '@/types/host';
import type { PropertyBranch } from '@/types/branch';

const AVAILABLE_VERTICALS = ['cafe', 'restaurant', 'resort', 'dorm', 'estate'] as const;

export function ProfileWorkspace() {
  const profile = useHostWorkspace((state) => state.profile);
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const patchProfile = useHostWorkspace((state) => state.patchProfile);
  const upsertBranch = useHostWorkspace((state) => state.upsertBranch);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Primary branch mapped as the business entity
  const primaryBranch = propertyBranches[0];

  // Controlled form state to prevent loss on re-render
  const [formData, setFormData] = useState({
    fullName: profile?.legalEntityName || '',
    displayName: profile?.displayName || '',
    email: profile?.contact.email || '',
    phone: profile?.contact.phone || '',
    gender: 'prefer_not_to_say', // Backend dob/gender not mapped directly to store yet
    offersAccommodation: profile?.offersAccommodation ?? false,
    dob: '', 
    ecosystemStatement: profile?.ecosystemStatement || '',
    businessName: primaryBranch?.name || profile?.legalEntityName || '',
    gstNumber: primaryBranch?.gstNumber || '',
    bankName: primaryBranch?.bankName || '',
    bankAccountNumber: primaryBranch?.bankAccountNumber || '',
    bankIfscCode: primaryBranch?.bankIfscCode || '',
    upiId: primaryBranch?.upiId || '',
    regType: 'pvt',
    aesthetic: 'white',
  });

  const [selectedCategories, setSelectedCategories] = useState<CategoryHandled[]>(profile?.categoriesHandled || []);

  // Sync state on hydrate if profile updates externally
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.legalEntityName || '',
        displayName: profile.displayName || '',
        email: profile.contact.email || '',
        phone: profile.contact.phone || '',
        gender: profile.gender || 'prefer_not_to_say',
        offersAccommodation: profile.offersAccommodation ?? false,
        dob: profile.dob || '',
        ecosystemStatement: profile.ecosystemStatement || '',
        businessName: propertyBranches[0]?.name || profile.legalEntityName || '',
        gstNumber: propertyBranches[0]?.gstNumber || '',
        bankName: propertyBranches[0]?.bankName || '',
        bankAccountNumber: propertyBranches[0]?.bankAccountNumber || '',
        bankIfscCode: propertyBranches[0]?.bankIfscCode || '',
        upiId: propertyBranches[0]?.upiId || '',
      }));
      setSelectedCategories(profile.categoriesHandled || []);
    }
  }, [profile, propertyBranches]);

  if (!profile) return null;

  function toggleVertical(vertical: CategoryHandled) {
    if (selectedCategories.includes(vertical)) {
      setSelectedCategories(prev => prev.filter(v => v !== vertical));
    } else {
      setSelectedCategories(prev => [...prev, vertical]);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleDiscard() {
    // Reset to pristine state from store
    setFormData({
      fullName: profile?.legalEntityName || '',
      displayName: profile?.displayName || '',
      email: profile?.contact.email || '',
      phone: profile?.contact.phone || '',
      gender: profile?.gender || 'prefer_not_to_say',
      offersAccommodation: profile?.offersAccommodation ?? false,
      dob: profile?.dob || '',
      ecosystemStatement: profile?.ecosystemStatement || '',
      businessName: primaryBranch?.name || profile?.legalEntityName || '',
      gstNumber: primaryBranch?.gstNumber || '',
      bankName: primaryBranch?.bankName || '',
      bankAccountNumber: primaryBranch?.bankAccountNumber || '',
      bankIfscCode: primaryBranch?.bankIfscCode || '',
      upiId: primaryBranch?.upiId || '',
      regType: 'pvt',
      aesthetic: 'white',
    });
    setSelectedCategories(profile?.categoriesHandled || []);
    setSuccess('');
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess('');
    setError('');

    const payload = {
      fullName: formData.fullName,
      displayName: formData.displayName,
      email: formData.email,
      phone: formData.phone,
      gender: formData.gender,
      offersAccommodation: formData.offersAccommodation,
      dob: formData.dob,
      ecosystemStatement: formData.ecosystemStatement,
      categoriesHandled: selectedCategories,
      businesses: primaryBranch ? [{
        id: primaryBranch.id,
        businessName: formData.businessName,
        gstNumber: formData.gstNumber,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankIfscCode: formData.bankIfscCode,
        upiId: formData.upiId,
      }] : []
    };

    try {
      // 1. Client side basic validation
      const bGst = payload.businesses[0]?.gstNumber;
      if (bGst && !/^[0-9A-Z]{15}$/.test(bGst)) {
        throw new Error('GST Number must be a valid 15-character alphanumeric string.');
      }
      if (payload.phone && !/^\d{10}$/.test(payload.phone)) {
        throw new Error('Phone number must be exactly 10 digits.');
      }

      // 2. Network Request
      const response = await fetch('/api/host/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update enterprise profile.');
      }

      // 3. Hydrate State
      const bName = payload.businesses[0]?.businessName;
      patchProfile({
        displayName: payload.displayName,
        legalEntityName: bName || payload.fullName,
        categoriesHandled: selectedCategories,
        ecosystemStatement: payload.ecosystemStatement,
        contact: { email: payload.email, phone: payload.phone || null },
        dob: payload.dob || undefined,
        gender: payload.gender || undefined,
        offersAccommodation: payload.offersAccommodation,
      });

      if (primaryBranch) {
        upsertBranch({
          ...primaryBranch,
          name: bName || primaryBranch.name,
          gstNumber: (bGst as PropertyBranch['gstNumber']) || null,
          bankName: payload.businesses[0]?.bankName || null,
          bankAccountNumber: payload.businesses[0]?.bankAccountNumber || null,
          bankIfscCode: payload.businesses[0]?.bankIfscCode || null,
          upiId: payload.businesses[0]?.upiId || null,
        });
      }

      setSuccess('Enterprise data successfully committed to ledger.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'An unexpected database constraint error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black";
  const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500";

  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col min-h-full">
      
      <header className="mb-10 flex flex-col items-start justify-between sm:flex-row sm:items-end">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900">Master Administrator & Facility Settings</h2>
          <p className="mt-2 text-sm text-zinc-500">Configure your master administrator identity and enterprise metadata.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="inline-flex items-center rounded-xl bg-zinc-950 px-4 py-2 font-mono text-xs text-white shadow-sm">
            <span className="mr-2 text-zinc-500">ID /</span> {profile.uniqueOwnerCafeId}
          </span>
        </div>
      </header>

      {/* Global Banners */}
      {error && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
          <p className="font-medium">Constraint Validation Failed</p>
          <p className="mt-1 text-red-500">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-sm text-green-700 shadow-sm">
          <p className="font-medium">Success</p>
          <p className="mt-1 text-green-600">{success}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-10 pb-32">
        
        {/* Quadrant I: Identity */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
          <h3 className="mb-8 font-serif text-xl font-medium text-black border-b border-zinc-100 pb-4">01. Master Identity</h3>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="fullName" className={labelClass}>Full Legal Name</label>
              <input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="displayName" className={labelClass}>Display Name</label>
              <input id="displayName" name="displayName" value={formData.displayName} onChange={handleInputChange} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Contact Email</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Contact Phone</label>
              <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="10-digit number" className={inputClass} />
            </div>
            <div>
              <label htmlFor="dob" className={labelClass}>Date of Birth</label>
              <input id="dob" name="dob" type="date" value={formData.dob} onChange={handleInputChange} className={inputClass} />
            </div>
            <div>
              <label htmlFor="gender" className={labelClass}>Gender Identity</label>
              <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} className={inputClass}>
                <option value="prefer_not_to_say">Prefer Not to Say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* Quadrant II: Enterprise Metadata */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
          <h3 className="mb-8 font-serif text-xl font-medium text-black border-b border-zinc-100 pb-4">02. Business & Entity Metadata</h3>
          
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Registered Verticals</label>
              <div className="flex flex-wrap gap-3 mt-3">
                {AVAILABLE_VERTICALS.map((vertical) => (
                  <button
                    key={vertical}
                    type="button"
                    onClick={() => toggleVertical(vertical)}
                    className={`rounded-xl border px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all ${
                      selectedCategories.includes(vertical)
                        ? 'border-black bg-zinc-950 text-white shadow-md'
                        : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    {vertical.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 mt-2 flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <div>
                <label className="text-sm font-bold text-zinc-900">Offer Stay & Accommodation Services</label>
                <p className="mt-1 text-xs text-zinc-500">Enables room tariffs, check-in tracking, and accommodation catalog filters.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  name="offersAccommodation"
                  className="peer sr-only"
                  checked={formData.offersAccommodation}
                  onChange={(e) => setFormData(prev => ({ ...prev, offersAccommodation: e.target.checked }))}
                />
                <div className="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-black peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-zinc-300"></div>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="businessName" className={labelClass}>Registered Business Entity Name</label>
              <input id="businessName" name="businessName" value={formData.businessName} onChange={handleInputChange} required className={inputClass} />
            </div>

            <div>
              <label htmlFor="gstNumber" className={labelClass}>GST Identification Number</label>
              <input id="gstNumber" name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} placeholder="15-character alphanumeric" className={inputClass} />
            </div>
            
            <div>
              <label htmlFor="regType" className={labelClass}>Business Registration Type</label>
              <select id="regType" name="regType" value={formData.regType} onChange={handleInputChange} className={inputClass}>
                <option value="pvt">Private Limited Company</option>
                <option value="llp">Limited Liability Partnership (LLP)</option>
                <option value="prop">Sole Proprietorship</option>
                <option value="partner">Partnership</option>
              </select>
            </div>
          </div>
        </section>

        {/* Quadrant III: Enterprise Banking & Settlement Configuration */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
          <h3 className="mb-8 font-serif text-xl font-medium text-black border-b border-zinc-100 pb-4">03. Enterprise Banking & Settlement</h3>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="bankName" className={labelClass}>Registered Bank Name</label>
              <input id="bankName" name="bankName" value={formData.bankName} onChange={handleInputChange} placeholder="e.g. HDFC Bank, ICICI" className={inputClass} />
            </div>
            <div>
              <label htmlFor="bankAccountNumber" className={labelClass}>Account Number</label>
              <input id="bankAccountNumber" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleInputChange} placeholder="Account Number" className={`${inputClass} font-mono`} />
            </div>
            <div>
              <label htmlFor="bankIfscCode" className={labelClass}>IFSC Code</label>
              <input id="bankIfscCode" name="bankIfscCode" value={formData.bankIfscCode} onChange={handleInputChange} placeholder="e.g. HDFC0001234" className={`${inputClass} font-mono uppercase`} />
            </div>
            <div>
              <label htmlFor="upiId" className={labelClass}>Master UPI Handle</label>
              <input id="upiId" name="upiId" value={formData.upiId} onChange={handleInputChange} placeholder="merchant.name@bank" className={inputClass} />
            </div>
          </div>
        </section>
        
        {/* Fixed Footer Action Bar (SaaS Style) */}
        <div className="fixed bottom-0 right-0 z-50 flex w-[calc(100vw-16rem)] items-center justify-end gap-4 border-t border-zinc-200 bg-white/80 px-12 py-5 backdrop-blur-xl">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-transparent transition-colors hover:text-black rounded-lg disabled:opacity-50"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center rounded-lg bg-zinc-950 border border-zinc-950 px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:border-zinc-400 disabled:active:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Committing...
                </span>
              ) : (
                'Commit All Enterprise Changes'
              )}
            </button>
          </div>

      </form>
    </div>
  );
}
