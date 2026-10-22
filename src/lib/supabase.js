import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const hasSupabaseConfig = Boolean(url && key);
export const supabase = hasSupabaseConfig
  ? createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: { headers: { "X-Client-Info": "studysnap-sde-learning" } },
    })
  : null;

export const LEARNING_FILES_BUCKET = "learning-files";
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
