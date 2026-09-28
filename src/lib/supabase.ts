import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

export type Trip = {
  id: string;
  name: string;
  code: string;
};

export type Participant = {
  id: string;
  trip_id: string;
  name: string;
};

export type Expense = {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  payer_id: string;
  split_between: string[];
  settled: boolean;
};

export type ExpenseWithSplits = Expense & {
  splits: { member_id: string }[];
};

/** @deprecated Use Participant — kept so existing screens can migrate gradually */
export type Member = Participant;
