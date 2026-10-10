'use client';

import React from 'react';
import type { PhysicalRoom } from '@/types';
import { CheckInKeySection } from './CheckInKeySection';
import { CheckInGuestSection } from './CheckInGuestSection';
import { CheckInScheduleSection } from './CheckInScheduleSection';
import { CheckInOccasionSection } from './CheckInOccasionSection';
import { CheckInAddonsSection } from './CheckInAddonsSection';
import { CheckInTariffSummary } from './CheckInTariffSummary';

interface Props {
  room: PhysicalRoom;
  checkInState: any;
}

export function RoomCheckInForm({ room, checkInState }: Props) {
  const {
    roomNumber, setRoomNumber, roomPrice, guestName, setGuestName, guestPhone, setGuestPhone,
    guestEmail, setGuestEmail, guestAddress, setGuestAddress, idProofType, setIdProofType,
    idProofNumber, setIdProofNumber, checkInTime, handleCheckInDateChange, checkOutTime,
    handleCheckOutDateChange, nights, setNights, adultsCount, setAdultsCount, childrenCount,
    setChildrenCount, purposeOfVisit, setPurposeOfVisit, isCelebration, setIsCelebration,
    celebrationType, setCelebrationType, celebrationNote, setCelebrationNote, availableAddons,
    chosenAddonIds, toggleChosenAddon, handleAddCustomAddon, numNights, roomTariffTotal,
    checkInAddonsTotal, estimatedTotalWithAddons, isUpdating, selectedAddonsList, handleCheckIn,
  } = checkInState;

  return (
    <form onSubmit={handleCheckIn} className="space-y-8">
      <CheckInKeySection roomNumber={roomNumber} setRoomNumber={setRoomNumber} categoryName={room.category?.name || 'Standard Unit'} roomPrice={roomPrice} />
      <CheckInGuestSection
        guestName={guestName} setGuestName={setGuestName} guestPhone={guestPhone} setGuestPhone={setGuestPhone}
        guestEmail={guestEmail} setGuestEmail={setGuestEmail} guestAddress={guestAddress} setGuestAddress={setGuestAddress}
        idProofType={idProofType} setIdProofType={setIdProofType} idProofNumber={idProofNumber} setIdProofNumber={setIdProofNumber}
      />
      <CheckInScheduleSection
        checkInTime={checkInTime} onCheckInChange={handleCheckInDateChange} checkOutTime={checkOutTime}
        onCheckOutChange={handleCheckOutDateChange} nights={nights} setNights={setNights} adultsCount={adultsCount}
        setAdultsCount={setAdultsCount} childrenCount={childrenCount} setChildrenCount={setChildrenCount}
      />
      <CheckInOccasionSection
        purposeOfVisit={purposeOfVisit} setPurposeOfVisit={setPurposeOfVisit} isCelebration={isCelebration}
        setIsCelebration={setIsCelebration} celebrationType={celebrationType} setCelebrationType={setCelebrationType}
        celebrationNote={celebrationNote} setCelebrationNote={setCelebrationNote}
      />
      <CheckInAddonsSection availableAddons={availableAddons} chosenAddonIds={chosenAddonIds} toggleChosenAddon={toggleChosenAddon} onAddCustomAddon={handleAddCustomAddon} numNights={numNights} adultsCount={parseInt(adultsCount, 10) || 1} />
      <CheckInTariffSummary
        numNights={numNights} roomPrice={roomPrice} roomTariffTotal={roomTariffTotal} checkInAddonsTotal={checkInAddonsTotal}
        chosenAddonsCount={chosenAddonIds.length} estimatedTotalWithAddons={estimatedTotalWithAddons} isUpdating={isUpdating}
        selectedAddonsList={selectedAddonsList} adultsCount={parseInt(adultsCount, 10) || 1}
      />
    </form>
  );
}
