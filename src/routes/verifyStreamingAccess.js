import { json } from "../utils/json";

export async function verifyStreamingAccess(request, env, cors) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const collectionId = url.searchParams.get("collection_id");
    
    if (!token || !collectionId) {
      return json({ 
        hasAccess: false, 
        message: "Missing token or collection ID" 
      }, 200, cors);
    }
    
    // Check if token is valid and not expired
    const access = await env.DB.prepare(`
      SELECT 
        id, 
        order_id, 
        collection_id, 
        user_email, 
        expires_at,
        created_at
      FROM video_access 
      WHERE access_token = ? 
        AND collection_id = ? 
        AND expires_at > datetime('now')
    `).bind(token, collectionId).first();
    
    if (access) {
      return json({ 
        hasAccess: true, 
        expires_at: access.expires_at,
        collection_id: access.collection_id,
        message: "Access granted"
      }, 200, cors);
    }
    
    // Check if token exists but expired
    const expiredAccess = await env.DB.prepare(`
      SELECT expires_at FROM video_access 
      WHERE access_token = ? AND collection_id = ?
    `).bind(token, collectionId).first();
    
    if (expiredAccess) {
      return json({ 
        hasAccess: false, 
        message: "Access token has expired. Please contact support to renew access." 
      }, 200, cors);
    }
    
    return json({ 
      hasAccess: false, 
      message: "Invalid access token. Please check your link or contact support." 
    }, 200, cors);
    
  } catch (err) {
    console.error("Verify streaming access error:", err);
    return json({ 
      hasAccess: false, 
      message: "Server error. Please try again later." 
    }, 500, cors);
  }
}