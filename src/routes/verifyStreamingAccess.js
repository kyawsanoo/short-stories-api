import { json } from "../utils/json";

export async function verifyStreamingAccess(request, env, cors) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    let collectionId = url.searchParams.get("collection_id");
    if (!collectionId) {
      collectionId = url.searchParams.get("id");
    }
    
    console.log("🔍 Verify:", { token, collectionId });
    
    if (!token || !collectionId) {
      return json({ 
        hasAccess: false, 
        message: "Missing token or collection ID" 
      }, 200, cors);
    }
    
    // Get session ID from header
    const requestSessionId = request.headers.get('X-Session-ID');
    
    // Query database
    const access = await env.DB.prepare(`
      SELECT 
        id, 
        order_id, 
        collection_id, 
        user_email, 
        user_id,
        session_id,
        expires_at,
        created_at,
        access_token
      FROM video_access 
      WHERE access_token = ? 
        AND collection_id = ?
    `).bind(token, parseInt(collectionId)).first();
    
    console.log("📊 Found:", access ? "YES" : "NO");
    
    if (!access) {
      return json({ 
        hasAccess: false, 
        message: "Invalid access token. Please check your link." 
      }, 200, cors);
    }
    
    // Check expiration
    if (new Date(access.expires_at) < new Date()) {
      return json({ 
        hasAccess: false, 
        message: "Access token has expired. Please contact support." 
      }, 200, cors);
    }
    
    // Check session mismatch (if session_id is already set)
    if (access.session_id && access.session_id !== requestSessionId) {
      console.log("⚠️ Session mismatch! Stored:", access.session_id, "Current:", requestSessionId);
      return json({ 
        hasAccess: false, 
        session_mismatch: true,
        message: "This video is already playing on another device. Multiple streams are not allowed." 
      }, 200, cors);
    }
    
    // Store session ID on first valid request
    if (!access.session_id && requestSessionId) {
      await env.DB.prepare(`
        UPDATE video_access SET session_id = ? WHERE access_token = ?
      `).bind(requestSessionId, token).run();
      console.log("✅ Session ID saved:", requestSessionId);
    }
    
    // Check user if token has user_id (optional)
    if (access.user_id) {
      const authHeader = request.headers.get('Authorization');
      let currentUser = null;
      
      if (authHeader) {
        const userToken = authHeader.replace('Bearer ', '');
        currentUser = await env.DB.prepare(`
          SELECT id FROM users WHERE token = ?
        `).bind(userToken).first();
      }
      
      if (!currentUser) {
        return json({ 
          hasAccess: false, 
          login_required: true,
          message: "Please login to watch this video" 
        }, 200, cors);
      }
      
      if (currentUser.id !== access.user_id) {
        return json({ 
          hasAccess: false, 
          message: "This video belongs to another user" 
        }, 200, cors);
      }
    }
    
    return json({ 
      hasAccess: true, 
      collection_id: access.collection_id,
      message: "Access granted" 
    }, 200, cors);
    
  } catch (err) {
    console.error("❌ Error:", err);
    return json({ 
      hasAccess: false, 
      message: "Server error. Please try again." 
    }, 500, cors);
  }
}