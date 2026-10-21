export type RoomStatus = 'VACANT' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';

export type RoomAddonBillingType = 'per_night' | 'per_person_per_day' | 'per_stay';

export interface RoomAddon {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  billingType: RoomAddonBillingType;
  /** People a per-person add-on was booked for at check-in; checkout bills by it. */
  persons?: number;
}

export interface RoomCategory {
  id: string;
  business_id: string;
  catalog_item_id?: string | null;
  name: string;
  price: number;
  occupancy: number;
  total_units: number;
  photos: string[];
  amenities: string[];
  addons?: RoomAddon[];
  available_addons?: RoomAddon[];
  created_at?: string;
  catalog_item?: {
    id: string;
    name: string;
    price: number;
    is_available: boolean;
    image_url?: string | null;
  };
  rooms?: PhysicalRoom[];
}

export interface PhysicalRoom {
  id: string;
  business_id: string;
  category_id: string;
  room_number: string;
  status: RoomStatus;
  current_guest_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_id_proof?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  guest_email?: string | null;
  guest_address?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_guests?: number | null;
  purpose_of_visit?: string | null;
  is_celebration?: boolean;
  celebration_type?: string | null;
  celebration_note?: string | null;
  qr_code_hash?: string | null;
  selected_addons?: RoomAddon[];
  created_at?: string;
  category?: RoomCategory;
  activeOrdersCount?: number;
  activeOrdersTotal?: number;
  /** How the guest arrived: at the desk, by self check-in, or from an advance booking (migration 20261021000005). */
  checkin_source?: 'desk' | 'self' | 'booking' | null;
  /** Object path of the ID photo in the private bucket; the host views it through a signed URL. */
  id_proof_path?: string | null;
  id_verified_at?: string | null;
  /** Front desk only, never stored: the booking this free room is being held for (see reservation-overlay). */
  reserved_for?: (import('@/lib/services/stay/reservation-overlay').ReservationLite & Record<string, any>) | null;
  /** Paid before check-in and credited at checkout (migration 20261021000007). */
  advance_paid?: number | null;
  /** Early check-in and late check-out fee lines that belong on the final bill. */
  stay_extras?: Array<{ id: string; name: string; price: number; qty: number; type: string }> | null;
  /** The guest's late check-out request, waiting for (or declined by) the desk. */
  late_checkout_request?: { status: 'pending' | 'declined'; option_id: string; label: string; time: string; fee: number; requested_at: string } | null;
  /** The guest says they are ready to leave: the desk prepares the bill and checks them out, or dismisses it. */
  checkout_request?: { kind?: 'checkout' | 'bill'; status: 'pending'; requested_at: string; note: string | null } | null;
}

export interface RoomStayLog {
  id: string;
  business_id: string;
  room_id: string;
  guest_name: string;
  guest_phone: string;
  guest_id_proof?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  guest_email?: string | null;
  guest_address?: string | null;
  check_in_time: string;
  check_out_time?: string | null;
  total_guests?: number | null;
  purpose_of_visit?: string | null;
  is_celebration?: boolean;
  celebration_type?: string | null;
  celebration_note?: string | null;
  selected_addons?: RoomAddon[];
  total_billed_amount?: number | null;
  /** Paid before checkout (the reservation's room bill, late check-out fees) and credited against the final bill. */
  advance_paid?: number | null;
  created_at?: string;
}

export interface HistoricalStayRecord extends RoomStayLog {
  nights: number;
  status: 'SETTLED' | 'IN_HOUSE';
  room?: {
    id: string;
    room_number: string;
    category?: {
      id: string;
      name: string;
      price: number;
      photos?: string[];
      amenities?: string[];
    };
  };
  room_number?: string;
  category_name?: string;
  category_price?: number;
  calculated_tariff?: number;
  addons_total?: number;
  orders_total?: number;
}

export interface StayHistoryMetrics {
  totalCheckouts: number;
  checkoutsThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  avgLengthOfStay: number;
  totalGuestsHosted: number;
}



