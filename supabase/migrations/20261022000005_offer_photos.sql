-- A photo on a live offer (safe to re-run).
--
-- The host can add a photo to an offer (a buffet spread, a cocktail, a suite): uploaded from the phone's camera or
-- gallery, or downloaded from a link the host pastes. Either way the server keeps its own copy in the venue's storage
-- (venue-vault/<venue>/offers/...), and only such an address is accepted here, so an offer never shows a picture from
-- somewhere else. Until this runs, offers work as before without photos.

ALTER TABLE public.venue_live_offers ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.venue_live_offers.image_url IS
  'The offer''s photo, stored in the venue''s own storage (venue-vault/<venue>/offers/). Null for a text-only offer.';
