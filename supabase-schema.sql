-- Villa Booking App - Supabase Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'cleaner')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'monthly', 'annual')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties (Villas/Rooms)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_amount DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT FALSE,
  color TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Housekeeping status
CREATE TABLE IF NOT EXISTS housekeeping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  is_clean BOOLEAN DEFAULT FALSE,
  cleaned_by UUID REFERENCES profiles(id),
  cleaned_at TIMESTAMPTZ,
  verified_by_owner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (for Stripe integration)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT CHECK (plan IN ('monthly', 'annual')),
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Properties: Owners can manage their own properties
CREATE POLICY "Owners can view own properties" ON properties
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert properties" ON properties
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own properties" ON properties
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete own properties" ON properties
  FOR DELETE USING (owner_id = auth.uid());

-- Bookings: Users can manage bookings for their properties
CREATE POLICY "Users can view bookings for their properties" ON bookings
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can insert bookings for their properties" ON bookings
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update bookings for their properties" ON bookings
  FOR UPDATE USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete bookings for their properties" ON bookings
  FOR DELETE USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

-- Housekeeping: Similar to bookings
CREATE POLICY "Users can view housekeeping for their properties" ON housekeeping
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can insert housekeeping" ON housekeeping
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update housekeeping" ON housekeeping
  FOR UPDATE USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

-- Invoices
CREATE POLICY "Users can view invoices for their bookings" ON invoices
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoices for their bookings" ON invoices
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

-- Subscriptions
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- Create Storage bucket for property images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload to their own folder
CREATE POLICY "Users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy: Anyone can view property images
CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Storage policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
