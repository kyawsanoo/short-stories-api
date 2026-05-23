import { createClient } from "@supabase/supabase-js";

export function getSupabase(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase env not configured");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

/**
 * SAFE signed URL generator (FIXES YOUR TOKEN ERROR)
 */
export async function createSignedUrl(filePath, env) {
  const supabase = getSupabase(env);

  // clean path (VERY IMPORTANT)
  const cleanPath = filePath.replace(/^\/+/, "");

  const { data, error } = await supabase.storage
    .from("ebooks")
    .createSignedUrl(cleanPath, 60 * 60 * 24); // 24h

  if (error) {
    console.log("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  if (!data?.signedUrl) {
    throw new Error("Signed URL missing");
  }

  return data.signedUrl;
}