import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const configured = Boolean(url && key && url.startsWith('https://') && !url.includes('YOUR-PROJECT') && !key.includes('YOUR_'));
export const supabase = configured ? createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
}) : null;
export const PUBLIC_BUCKET = 'wallpaper-public';
export const PRIVATE_BUCKET = 'wallpaper-submissions';
export function publicImageUrl(path) {
  if (!supabase || !path) return null;
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
}
