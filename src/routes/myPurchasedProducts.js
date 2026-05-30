export async function myPurchasedProducts(request, env, cors) {
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://fundorashop.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ products: [] }), { status: 200, headers });
    }

    const userToken = authHeader.replace("Bearer ", "");
    
    // Use the correct column name: session_token
    const user = await env.DB.prepare(`
      SELECT id, email FROM users WHERE session_token = ?
    `).bind(userToken).first();

    if (!user) {
      return new Response(JSON.stringify({ products: [] }), { status: 200, headers });
    }

    // Query purchased products (same as before)
    const purchases = await env.DB.prepare(`
      SELECT 
        o.id as order_id,
        o.product_type,
        o.product_id,
        o.status,
        o.created_at as purchased_date,
        b.title as book_title,
        b.cover as book_cover,
        b.author as book_author,
        vc.title as video_title,
        vc.thumbnail as video_thumbnail,
        ba.access_token as book_token,
        va.access_token as video_token,
        va.expires_at as video_expires
      FROM orders o
      LEFT JOIN books b ON o.product_id = b.id AND o.product_type = 'book'
      LEFT JOIN video_collections vc ON o.product_id = vc.id AND o.product_type = 'video_collection'
      LEFT JOIN book_access ba ON o.id = ba.order_id
      LEFT JOIN video_access va ON o.id = va.order_id
      WHERE o.email = ? AND o.status = 'paid'
      ORDER BY o.created_at DESC
    `).bind(user.email).all();

    const products = (purchases.results || []).map(p => {
  let productId = p.product_id;
  // If product_id is a number-like string ending with .0 (e.g., "1.0"), convert to integer string
  if (typeof productId === 'string' && productId.includes('.') && !isNaN(parseFloat(productId))) {
    productId = Math.floor(parseFloat(productId)).toString();
  }
  return {
    order_id: p.order_id,
    product_type: p.product_type,
    product_id: productId,
    purchased_date: p.purchased_date,
    title: p.book_title || p.video_title,
    cover: p.book_cover || p.video_thumbnail,
    author: p.book_author,
    access_token: p.book_token || p.video_token,
    expires_at: p.video_expires,
    is_expired: p.video_expires ? new Date(p.video_expires) < new Date() : false,
  };
});

    return new Response(JSON.stringify({ products }), { status: 200, headers });

  } catch (error) {
    console.error('❌ Error in myPurchasedProducts:', error);
    return new Response(JSON.stringify({ error: error.message, products: [] }), {
      status: 500,
      headers,
    });
  }
}