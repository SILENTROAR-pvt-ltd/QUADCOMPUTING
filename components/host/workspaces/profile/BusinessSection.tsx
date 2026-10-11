'use client';

import { businessModel } from '@/lib/venue/venue-model';
import { REGISTRATION_TYPES } from '@/lib/services/profile/profile-rules';
import { Field, Section, input, type FieldBinding } from './ProfileFields';

/** The host confirms the GSTIN is theirs and active. Only then may bills carry GST (gst-policy.ts). */
function GstConfirm({ f }: { f: FieldBinding }) {
  const on = f.checked('venue.gstVerified');
  return (
    <label className={`mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs ${on ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <input type="checkbox" checked={on} onChange={(e) => f.setChecked('venue.gstVerified', e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-neutral-900" />
      <span>
        <span className="block font-semibold">{on ? 'GSTIN confirmed: GST can be added to bills' : 'Confirm to charge GST'}</span>
        I confirm this GSTIN is registered to this business and is active. Until confirmed, bills carry no GST.
      </span>
    </label>
  );
}

/** The venue's name, legal registration, tax numbers, contact and (for stays) check-in times. */
export function BusinessSection({ f, types }: { f: FieldBinding; types: string[] }) {
  // GSTIN and PAN display in capitals here and are stored upper-case by the server.
  const model = businessModel(types);

  return (
    <Section id="business" title="Business details" description="Printed on GST invoices and receipts.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue name" hint="What guests see on the menu and bills." error={f.err('venue.businessName')}>
          <input required value={f.value('venue.businessName')} onChange={f.set('venue.businessName')} className={input} placeholder="e.g. Bombay Rasoi" aria-invalid={Boolean(f.err('venue.businessName'))} />
        </Field>
        <Field label="Registered (legal) name" hint="As on your GST or company registration.">
          <input value={f.value('venue.legalName')} onChange={f.set('venue.legalName')} className={input} placeholder="e.g. Rasoi Hospitality Pvt Ltd" />
        </Field>
        <Field label="Registration type" error={f.err('venue.registrationType')}>
          <select value={f.value('venue.registrationType')} onChange={f.set('venue.registrationType')} className={input}>
            <option value="">Choose…</option>
            {REGISTRATION_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <div>
          <Field label="GSTIN" hint="Leave blank if not registered for GST." error={f.err('venue.gstNumber')}>
            <input value={f.value('venue.gstNumber')} maxLength={15} className={`${input} uppercase`} placeholder="02AABCB1234C1Z5" aria-invalid={Boolean(f.err('venue.gstNumber'))}
              onChange={(e) => { f.set('venue.gstNumber')(e); if (f.checked('venue.gstVerified')) f.setChecked('venue.gstVerified', false); }} />
          </Field>
          {f.value('venue.gstNumber').trim() && <GstConfirm f={f} />}
        </div>
        <Field label="PAN" error={f.err('venue.panNumber')}>
          <input value={f.value('venue.panNumber')} onChange={f.set('venue.panNumber')} maxLength={10} className={`${input} uppercase`} placeholder="ABCDE1234F" aria-invalid={Boolean(f.err('venue.panNumber'))} />
        </Field>
        {model !== 'stay' && (
          <Field label="FSSAI licence number" hint="Required for food businesses; shown on bills." error={f.err('venue.fssaiNumber')}>
            <input inputMode="numeric" value={f.value('venue.fssaiNumber')} onChange={f.set('venue.fssaiNumber')} maxLength={14} className={input} placeholder="14 digits" aria-invalid={Boolean(f.err('venue.fssaiNumber'))} />
          </Field>
        )}
        <Field label="Venue phone" hint="For guests and bookings." error={f.err('venue.contactPhone')}>
          <input type="tel" inputMode="tel" value={f.value('venue.contactPhone')} onChange={f.set('venue.contactPhone')} className={input} placeholder="98765 43210" aria-invalid={Boolean(f.err('venue.contactPhone'))} />
        </Field>
        <Field label="Venue email" error={f.err('venue.contactEmail')}>
          <input type="email" value={f.value('venue.contactEmail')} onChange={f.set('venue.contactEmail')} className={input} placeholder="hello@yourvenue.in" aria-invalid={Boolean(f.err('venue.contactEmail'))} />
        </Field>
        {model !== 'food' && (
          <>
            <Field label="Standard check-in time" error={f.err('venue.checkinTime')}>
              <input type="time" value={f.value('venue.checkinTime')} onChange={f.set('venue.checkinTime')} className={input} />
            </Field>
            <Field label="Standard check-out time" error={f.err('venue.checkoutTime')}>
              <input type="time" value={f.value('venue.checkoutTime')} onChange={f.set('venue.checkoutTime')} className={input} />
            </Field>
          </>
        )}
      </div>
    </Section>
  );
}
