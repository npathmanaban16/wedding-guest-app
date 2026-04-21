import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = extra.supabaseUrl as string | undefined;
const supabaseKey = extra.supabaseKey as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[supabase] Missing supabaseUrl/supabaseKey in expo extra. Check app.config.ts.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
