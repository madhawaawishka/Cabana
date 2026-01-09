-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL,
  customer_id uuid,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'refunded'::text])),
  booking_status text DEFAULT 'confirmed'::text CHECK (booking_status = ANY (ARRAY['confirmed'::text, 'checked_in'::text, 'checked_out'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  check_in date NOT NULL DEFAULT CURRENT_DATE,
  check_out date NOT NULL DEFAULT CURRENT_DATE,
  color text,
  customer_email text,
  customer_name text,
  customer_phone text,
  is_paid boolean DEFAULT false,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.cleaning_status (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL,
  booking_id uuid,
  cleaner_id uuid,
  is_cleaned boolean DEFAULT false,
  owner_verified boolean DEFAULT false,
  cleaned_at timestamp with time zone,
  verified_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cleaning_status_pkey PRIMARY KEY (id),
  CONSTRAINT cleaning_status_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT cleaning_status_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT cleaning_status_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.users(id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  nic text,
  color_code text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  tax numeric DEFAULT 0,
  total numeric NOT NULL,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'cancelled'::text])),
  pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'villa'::text CHECK (type = ANY (ARRAY['hotel_room'::text, 'villa'::text, 'cottage'::text, 'apartment'::text])),
  description text,
  photo_url text,
  price_per_night numeric NOT NULL DEFAULT 0,
  max_guests integer DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.reminders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['booking_upcoming'::text, 'payment_due'::text, 'checkout_reminder'::text])),
  remind_at timestamp with time zone NOT NULL,
  is_sent boolean DEFAULT false,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  plan_type text DEFAULT 'free'::text CHECK (plan_type = ANY (ARRAY['free'::text, 'basic'::text, 'premium'::text])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'trial'::text])),
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  provider_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  phone text,
  role text DEFAULT 'owner'::text CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'cleaner'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);