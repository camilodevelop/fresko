/** true si las variables de Supabase están configuradas (en Vercel pueden faltar al inicio). */
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
