/**
 * Supabase clients — SERVER ONLY.
 *  - `supabaseAdmin` uses the service-role key (bypasses RLS): Auth admin operations and private Storage.
 *  - `createAuthClient()` uses the anon key for password sign-in / refresh, one instance per call so
 *    sessions are never shared between requests.
 * The service-role key is never sent to either React application.
 */
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);
export const createAuthClient = () => createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, opts);
