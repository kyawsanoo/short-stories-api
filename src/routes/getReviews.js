import { json } from "../utils/json";

export async function getReviews(request, env, cors) {
  try {
    const url = new URL(request.url);
    const bookId = url.searchParams.get("book_id");
    
    if (!bookId) {
      return json({ ok: false, error: "Missing book_id" }, 400, cors);
    }
    
    const reviews = await env.DB.prepare(`
      SELECT 
        id, 
        user_name, 
        user_email,
        rating, 
        review, 
        verified_purchase, 
        created_at
      FROM book_reviews 
      WHERE book_id = ?
      ORDER BY created_at DESC
    `).bind(bookId).all();
    
    return json({ 
      ok: true, 
      reviews: reviews.results || [],
      count: reviews.results?.length || 0
    }, 200, cors);
    
  } catch (err) {
    console.error("Get reviews error:", err);
    return json({ ok: false, error: err.message }, 500, cors);
  }
}