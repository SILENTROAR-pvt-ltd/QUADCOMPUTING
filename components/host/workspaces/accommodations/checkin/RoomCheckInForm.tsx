'use client';

import React from 'react';
import { CheckInGuestSection } from './CheckInGuestSection';
import { CheckInScheduleSection } from './CheckInScheduleSection';
import { CheckInOccasionSection } from './CheckInOccasionSection';
import { CheckInAddonsSection } from './CheckInAddonsSection';
import { CheckInPaymentSection } from './CheckInPaymentSection';

export const CHECK_IN_FORM_ID = 'room-checkin-form';

/** The desk's check-in, top to bottom: the guest, the stay, the visit, the extras, and when they pay. Submitted from the panel's footer. */
export function RoomCheckInForm({ checkInState: s }: { checkInState: any }) {
  return (
    <form id={CHECK_IN_FORM_ID} onSubmit={s.handleCheckIn} className="space-y-3">
      <CheckInGuestSection
        guestName={s.guestName} setGuestName={s.setGuestName} guestPhone={s.guestPhone} setGuestPhone={s.setGuestPhone}
        guestEmail={s.guestEmail} setGuestEmail={s.setGuestEmail} guestAddress={s.guestAddress} setGuestAddress={s.setGuestAddress}
        idProofType={s.idProofType} setIdProofType={s.setIdProofType} idProofNumber={s.idProofNumber} setIdProofNumber={s.setIdProofNumber}
      />
      <CheckInScheduleSection
        checkInTime={s.checkInTime} onCheckInChange={s.handleCheckInDateChange} checkOutTime={s.checkOutTime} onCheckOutChange={s.handleCheckOutDateChange}
        nights={s.nights} setNights={s.setNights} adultsCount={s.adultsCount} setAdultsCount={s.setAdultsCount} childrenCount={s.childrenCount} setChildrenCount={s.setChildrenCount}
      />
      <CheckInOccasionSection
        purposeOfVisit={s.purposeOfVisit} setPurposeOfVisit={s.setPurposeOfVisit} isCelebration={s.isCelebration} setIsCelebration={s.setIsCelebration}
        celebrationType={s.celebrationType} setCelebrationType={s.setCelebrationType} celebrationNote={s.celebrationNote} setCelebrationNote={s.setCelebrationNote}
      />
      <CheckInAddonsSection availableAddons={s.availableAddons} chosenAddonIds={s.chosenAddonIds} toggleChosenAddon={s.toggleChosenAddon} onAddCustomAddon={s.handleAddCustomAddon}
        numNights={s.numNights} adultsCount={parseInt(s.adultsCount, 10) || 1} />
      <CheckInPaymentSection stayTotal={s.stayTotal} payNow={s.payNow} setPayNow={s.setPayNow} advance={s.advance} setAdvance={s.setAdvance} />
    </form>
  );
}
