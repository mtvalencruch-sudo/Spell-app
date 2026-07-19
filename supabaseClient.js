import { createClient } from '@supabase/supabase-js'

// This checks if it's running in Vite (import.meta.env) or Node/Express (process.env)
const supabaseUrl = typeof process !== 'undefined' && process.env ? process.env.SUPABASE_URL : import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = typeof process !== 'undefined' && process.env ? process.env.SUPABASE_ANON_KEY : import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials are missing! Check your .env file.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
