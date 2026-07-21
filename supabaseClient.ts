import { createClient } from '@supabase/supabase-js';

// Vite client env vars are accessed via import.meta.env
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) : '')) as string;

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) : '')) as string;

// Safe fallback URL and Key to prevent app initialization crash on blank env vars
const safeUrl = (supabaseUrl && supabaseUrl.startsWith('http')) ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);