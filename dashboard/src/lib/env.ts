/** Supabase project for the dashboard. The publishable key is public by design
 * (ARCHITECTURE §10); a build can override both with VITE_SUPABASE_*. */
import dev from './env.dev.json';

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || dev.supabaseUrl;
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || dev.supabasePublishableKey;
export const ENV: string = import.meta.env.VITE_GP_ENV || dev.env;
