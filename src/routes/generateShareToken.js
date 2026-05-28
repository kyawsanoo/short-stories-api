import { json } from "../utils/json";

export async function generateShareToken(request, env, cors) {
  try {
    // Verify admin access
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    const user = await env.DB.prepare(
      "SELECT email FROM users WHERE session_token = ?"
    ).bind(token).first();
    
    // Only admin can generate share tokens
    if (!user || user.email !== 'kyawsanoo.androider@gmail.com') {
      return json({ ok: false, error: "Admin access required" }, 403, cors);
    }
    
    const { collection_id, hours = 24, max_uses = 10 } = await request.json();
    
    const shareToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
    
    await env.DB.prepare(`
      INSERT INTO share_tokens (id, collection_id, token, expires_at, created_at, max_uses, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), collection_id, shareToken, 
      expiresAt.toISOString(), new Date().toISOString(), 
      max_uses, user.email
    ).run();
    
    const shareUrl = `https://fundorashop.com/share?token=${shareToken}&id=${collection_id}`;
    
    return json({ 
      ok: true, 
      share_url: shareUrl,
      token: shareToken,
      expires_at: expiresAt.toISOString(),
      max_uses: max_uses
    }, 200, cors);
    
  } catch (err) {
    console.error("Generate share token error:", err);
    return json({ ok: false, error: err.message }, 500, cors);
  }
}