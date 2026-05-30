export async function verifyStreamingAccess(request, env, cors) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    let collectionId = url.searchParams.get("collection_id") || url.searchParams.get("id");

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://fundorashop.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (!token || !collectionId) {
      return new Response(JSON.stringify({ hasAccess: false, message: "Missing token or ID" }), { status: 200, headers });
    }

    const access = await env.DB.prepare(`
      SELECT id, order_id, collection_id, user_email, user_id, expires_at, access_token
      FROM video_access
      WHERE access_token = ? AND collection_id = ?
    `).bind(token, parseInt(collectionId)).first();

    if (!access) {
      return new Response(JSON.stringify({ hasAccess: false, message: "Invalid token" }), { status: 200, headers });
    }

    if (new Date(access.expires_at) < new Date()) {
      return new Response(JSON.stringify({ hasAccess: false, message: "Token expired" }), { status: 200, headers });
    }

    // Get logged-in user
    const authHeader = request.headers.get('Authorization');
    let currentUserId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userToken = authHeader.slice(7);
      const user = await env.DB.prepare(
        "SELECT id FROM users WHERE session_token = ?"
      ).bind(userToken).first();
      currentUserId = user?.id;
    }

    // ---- User binding logic ----
    if (access.user_id) {
      // Token is bound to a specific user
      if (!currentUserId) {
        return new Response(JSON.stringify({ hasAccess: false, login_required: true, message: "Please log in to watch." }), { status: 200, headers });
      }
      if (currentUserId !== access.user_id) {
        return new Response(JSON.stringify({ hasAccess: false, message: "This video belongs to another user." }), { status: 200, headers });
      }
    } else {
      // Old token without user_id – require login but any user works (or you can allow without login)
      if (!currentUserId) {
        return new Response(JSON.stringify({ hasAccess: false, login_required: true, message: "Please log in to watch." }), { status: 200, headers });
      }
      // Optionally, bind this token to the current user now
      await env.DB.prepare(
        "UPDATE video_access SET user_id = ? WHERE access_token = ?"
      ).bind(currentUserId, token).run();
    }

    return new Response(JSON.stringify({ hasAccess: true, collection_id: access.collection_id, message: "Access granted" }), { status: 200, headers });

  } catch (err) {
    console.error("Verification error:", err);
    return new Response(JSON.stringify({ hasAccess: false, message: "Server error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}