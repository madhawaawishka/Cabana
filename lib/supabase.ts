import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'cleaner';
  subscription_tier: 'free' | 'monthly' | 'annual';
  subscription_expires_at: string | null;
  created_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  photo_url: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  property_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  check_in_date: string;
  check_out_date: string;
  total_amount: number | null;
  is_paid: boolean;
  color: string;
  notes: string | null;
  created_at: string;
  property?: Property;
}

export interface Housekeeping {
  id: string;
  property_id: string;
  booking_id: string;
  is_clean: boolean;
  cleaned_by: string | null;
  cleaned_at: string | null;
  verified_by_owner: boolean;
  created_at: string;
  property?: Property;
  booking?: Booking;
}

export interface Invoice {
  id: string;
  booking_id: string;
  invoice_number: string;
  amount: number;
  pdf_url: string | null;
  created_at: string;
  booking?: Booking;
}

// Helper function to generate unique color for customer
export const generateCustomerColor = (customerName: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500',
  ];
  const hash = customerName.split('').reduce((acc, char) =>
    char.charCodeAt(0) + ((acc << 5) - acc), 0);
  return colors[Math.abs(hash) % colors.length];
};
