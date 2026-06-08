import { createClient } from "@supabase/supabase-js";

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local"
  );
}

// Using untyped client; Row-level types are enforced at the app layer via src/types/index.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
});

// ─── Storage helpers ───────────────────────────────────────────────────────

export const SOURCES_BUCKET = "sources";

export async function uploadSourceFile(
  userId: string,
  notebookId: string,
  file: File
): Promise<string> {
  const ext  = file.name.split(".").pop();
  const path = `${userId}/${notebookId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(SOURCES_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(SOURCES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteSourceFile(fileUrl: string): Promise<void> {
  const url  = new URL(fileUrl);
  const path = url.pathname.split(`/${SOURCES_BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(SOURCES_BUCKET).remove([path]);
}

// ─── Token helpers ────────────────────────────────────────────────────────

export async function deductTokens(
  userId: string,
  amount: number,
  description: string
): Promise<number> {
  const { data, error } = await supabase.rpc("deduct_tokens", {
    p_user_id:     userId,
    p_amount:      amount,
    p_description: description,
  });
  if (error) throw error;
  return data as number;
}
