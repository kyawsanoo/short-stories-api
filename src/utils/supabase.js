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

export async function createSignedUrl(filePath, bucket, env) {
  const supabase = getSupabase(env);
  const cleanPath = filePath.replace(/^\/+/, "");
  
  // 1 day expiry (86,400 seconds)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(cleanPath, 60 * 60 * 24);

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  if (!data?.signedUrl) {
    throw new Error("Signed URL missing");
  }

  return data.signedUrl;
}