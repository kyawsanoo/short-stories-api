export async function verifyStreamingAccess(request, env, cors) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    let collectionId = url.searchParams.get("collection_id");
    if (!collectionId) {
      collectionId = url.searchParams.get("id");
    }
    
    // Add CORS headers to response
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://fundorashop.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID'
    };
    
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    
    if (!token || !collectionId) {
      return new Response(JSON.stringify({ hasAccess: false, message: "Missing token or ID" }), { status: 200, headers });
    }
    
    const access = await env.DB.prepare(`
      SELECT * FROM video_access 
      WHERE access_token = ? AND collection_id = ?
    `).bind(token, parseInt(collectionId)).first();
    
    if (!access) {
      return new Response(JSON.stringify({ hasAccess: false, message: "Invalid token" }), { status: 200, headers });
    }
    
    if (new Date(access.expires_at) < new Date()) {
      return new Response(JSON.stringify({ hasAccess: false, message: "Token expired" }), { status: 200, headers });
    }
    
    return new Response(JSON.stringify({ hasAccess: true, collection_id: access.collection_id, message: "Access granted" }), { status: 200, headers });
    
  } catch (err) {
    return new Response(JSON.stringify({ hasAccess: false, message: "Server error" }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}