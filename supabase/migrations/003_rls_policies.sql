-- supabase/migrations/003_rls_policies.sql

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile."
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile."
ON public.profiles FOR DELETE
USING (auth.uid() = id);

-- Businesses Policies
CREATE POLICY "Users can view their own businesses."
ON public.businesses FOR SELECT
USING (auth.uid() = host_id);

CREATE POLICY "Users can insert their own businesses."
ON public.businesses FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update their own businesses."
ON public.businesses FOR UPDATE
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can delete their own businesses."
ON public.businesses FOR DELETE
USING (auth.uid() = host_id);

-- Locations Policies
CREATE POLICY "Users can view locations of their businesses."
ON public.locations FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Users can insert locations for their businesses."
ON public.locations FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Users can update locations of their businesses."
ON public.locations FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Users can delete locations of their businesses."
ON public.locations FOR DELETE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE host_id = auth.uid()
  )
);
