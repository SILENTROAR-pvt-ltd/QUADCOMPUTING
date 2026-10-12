// Shapes of Club rows as the server reads them. Money is integer paise everywhere.
export type Generation = 'gen_alpha' | 'gen_z' | 'millennial' | 'gen_x' | 'boomer';
export type AccountType = 'viber' | 'business';
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface ViberProfile {
  user_id: string;
  viber_id: string;
  alias: string | null;
  alias_masked: boolean;
  dob: string;
  generation: Generation;
  city: string;
  state: string;
  country: string;
  account_type: AccountType;
  business_name: string | null;
  phone: string;
  phone_verified_at: string;
  vibe_line: string | null;
  avatar_url: string | null;
  club_username: string | null;
  username_changed_at: string | null;
  bio: string | null;
  status: MemberStatus;
  pass_number: string | null;
  campaign_source: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  muted_until: string | null;
  shadow_banned: boolean;
  created_at: string;
}

/**
 * What another member may see. Real identity stays hidden behind a masked alias. `handle` is the public
 * @handle without the @: the Club username if the member chose one, otherwise their Viber ID.
 */
export interface PublicMember {
  user_id: string;
  name: string;
  handle: string | null;
  generation: Generation;
  city: string;
  vibe_line: string | null;
  avatar_url: string | null;
  account_type: AccountType;
}

export type EventKind = 'tour' | 'event' | 'short_plan';
export type EventStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface ScheduleStep { label: string; bps: number }
export interface BudgetLine { label: string; amount: number }

export interface ClubEvent {
  id: string;
  creator_id: string;
  title: string;
  kind: EventKind;
  cover_paths: string[];
  starts_at: string;
  ends_at: string;
  venue: string | null;
  transport: string | null;
  food: string | null;
  activities: string | null;
  budget: BudgetLine[];
  cancellation_policy: string;
  safety_protocol: string;
  price_min: number;
  price_max: number;
  capacity: number;
  ticket_price: number;
  payment_schedule: ScheduleStep[];
  fee_bps: number | null;
  status: EventStatus;
  verified: boolean;
  review_note: string | null;
  created_at: string;
}
