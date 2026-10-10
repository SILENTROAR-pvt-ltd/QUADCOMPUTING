/** The dossier's running bill: what checkout would charge now, and the nights booked at check-in. */
export interface BillingSummary {
  nights: number;
  bookedNights?: number | null;
  roomRate: number;
  roomTariffSubtotal: number;
  addonsSubtotal: number;
  ordersSubtotal: number;
  grandTotalPayable: number;
}

export const EMPTY_SUMMARY: BillingSummary = {
  nights: 1, roomRate: 0, roomTariffSubtotal: 0, addonsSubtotal: 0, ordersSubtotal: 0, grandTotalPayable: 0,
};
