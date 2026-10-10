'use client';

import { INDIAN_STATES } from '@/lib/services/profile/profile-rules';
import { Field, Section, input, type FieldBinding } from './ProfileFields';

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'IndusInd Bank', 'IDFC FIRST Bank', 'Yes Bank', 'Federal Bank', 'Himachal Pradesh Gramin Bank'];

/** The venue's address, printed on invoices. */
export function AddressSection({ f }: { f: FieldBinding }) {
  return (
    <Section id="address" title="Address" description="Printed on invoices; the state also decides GST place of supply.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Street address" className="sm:col-span-2"><input value={f.value('location.address')} onChange={f.set('location.address')} className={input} placeholder="Shop no, building, street, area" /></Field>
        <Field label="City / town"><input value={f.value('location.city')} onChange={f.set('location.city')} className={input} /></Field>
        <Field label="State">
          <select value={f.value('location.state')} onChange={f.set('location.state')} className={input}>
            <option value="">Choose…</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="PIN code" error={f.err('location.pincode')}><input inputMode="numeric" maxLength={6} value={f.value('location.pincode')} onChange={f.set('location.pincode')} className={input} aria-invalid={Boolean(f.err('location.pincode'))} /></Field>
      </div>
    </Section>
  );
}

/** The owner's own details. */
export function OwnerSection({ f }: { f: FieldBinding }) {
  return (
    <Section id="owner" title="Owner" description="You, the account holder. Not shown to guests.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={f.err('owner.fullName')}><input required value={f.value('owner.fullName')} onChange={f.set('owner.fullName')} className={input} aria-invalid={Boolean(f.err('owner.fullName'))} /></Field>
        <Field label="Email" error={f.err('owner.email')}><input type="email" value={f.value('owner.email')} onChange={f.set('owner.email')} className={input} aria-invalid={Boolean(f.err('owner.email'))} /></Field>
        <Field label="Mobile" error={f.err('owner.phone')}><input type="tel" inputMode="tel" value={f.value('owner.phone')} onChange={f.set('owner.phone')} className={input} placeholder="98765 43210" aria-invalid={Boolean(f.err('owner.phone'))} /></Field>
        <Field label="Date of birth"><input type="date" value={f.value('owner.dob')} onChange={f.set('owner.dob')} className={input} /></Field>
        <Field label="Gender">
          <select value={f.value('owner.gender')} onChange={f.set('owner.gender')} className={input}>
            <option value="prefer_not_to_say">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select>
        </Field>
      </div>
    </Section>
  );
}

/** Where guest payments settle: bank account and the UPI ID used for pay-by-QR on bills. */
export function BankingSection({ f }: { f: FieldBinding }) {
  return (
    <Section id="banking" title="Payments & settlement" description="The UPI ID creates the pay-by-UPI QR on every bill.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="UPI ID" hint="e.g. bombayrasoi@okhdfcbank" error={f.err('banking.upiId')}><input value={f.value('banking.upiId')} onChange={f.set('banking.upiId')} className={input} placeholder="name@bank" aria-invalid={Boolean(f.err('banking.upiId'))} /></Field>
        <Field label="Bank"><input list="profile-banks" value={f.value('banking.bankName')} onChange={f.set('banking.bankName')} className={input} placeholder="Choose or type" /><datalist id="profile-banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist></Field>
        <Field label="Account number" error={f.err('banking.accountNumber')}><input inputMode="numeric" autoComplete="off" value={f.value('banking.accountNumber')} onChange={f.set('banking.accountNumber')} className={input} aria-invalid={Boolean(f.err('banking.accountNumber'))} /></Field>
        <Field label="IFSC" error={f.err('banking.ifsc')}><input maxLength={11} value={f.value('banking.ifsc')} onChange={f.set('banking.ifsc')} className={`${input} uppercase`} placeholder="HDFC0001234" aria-invalid={Boolean(f.err('banking.ifsc'))} /></Field>
      </div>
    </Section>
  );
}
