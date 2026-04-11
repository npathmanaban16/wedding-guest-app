import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://suranxrcuqguwzwfowye.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xrZgt_EivSAAdUoKAf6BmQ_Hg-2T1bw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
