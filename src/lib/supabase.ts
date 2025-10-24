import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          balance: number;
          earn_rate: number;
          last_claim: string | null;
          claim_cooldown: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          balance?: number;
          earn_rate?: number;
          last_claim?: string | null;
          claim_cooldown?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          balance?: number;
          earn_rate?: number;
          last_claim?: string | null;
          claim_cooldown?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
