import { json } from "../utils/json";

export async function verifyShareToken(request, env, cors) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const collectionId = url.searchParams.get("collection_id");
  
  if (!token || !collectionId) {
    return json({ valid: false, message: "Missing token" }, 200, cors);
  }
  
  const shareToken = await env.DB.prepare(`
    SELECT * FROM share_tokens 
    WHERE token = ? AND collection_id = ? AND expires_at > datetime('now')
  `).bind(token, collectionId).first();
  
  if (!shareToken) {
    return json({ valid: false, message: "Link expired or invalid" }, 200, cors);
  }
  
  // Increment usage count
  await env.DB.prepare(`
    UPDATE share_tokens SET usage_count = usage_count + 1 WHERE token = ?
  `).bind(token).run();
  
  return json({ 
    valid: true, 
    expires_at: shareToken.expires_at,
    usage_count: shareToken.usage_count + 1,
    max_uses: shareToken.max_uses
  }, 200, cors);
}