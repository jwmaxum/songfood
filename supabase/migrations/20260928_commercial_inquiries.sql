-- Export RFQ and domestic wholesale submissions are inquiries until a staff member issues a quote.
CREATE TABLE IF NOT EXISTS public.commercial_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('export_rfq', 'domestic_wholesale')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'responded', 'closed')),
  company text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_type text,
  business_registration_no text,
  country text,
  destination_port text,
  incoterms text,
  estimated_monthly_volume text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commercial_inquiries_kind_created_idx
  ON public.commercial_inquiries (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS commercial_inquiries_status_idx
  ON public.commercial_inquiries (status);
ALTER TABLE public.commercial_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_inquiries FROM anon, authenticated;
GRANT ALL ON public.commercial_inquiries TO service_role;
