import { json } from "../utils/json";

export async function submitRating(request, env, cors) {
  try {
    // Get user from auth token
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return json({ ok: false, error: "Login required" }, 401, cors);
    }
    
    // Get user email from session
    const user = await env.DB.prepare(
      "SELECT email, name FROM users WHERE session_token = ?"
    ).bind(token).first();
    
    if (!user) {
      return json({ ok: false, error: "Invalid session" }, 401, cors);
    }
    
    const body = await request.json();
    const bookId = body.book_id;
    const rating = parseInt(body.rating);
    const review = body.review || "";
    
    // Validation
    if (!bookId || !rating || rating < 1 || rating > 5) {
      return json({ ok: false, error: "Invalid rating" }, 400, cors);
    }
    
    // Check if book exists
    const book = await env.DB.prepare(
      "SELECT id FROM books WHERE id = ?"
    ).bind(bookId).first();
    
    if (!book) {
      return json({ ok: false, error: "Book not found" }, 404, cors);
    }
    
    // Check if user already rated this book
    const existing = await env.DB.prepare(
      "SELECT id FROM book_reviews WHERE book_id = ? AND user_email = ?"
    ).bind(bookId, user.email).first();
    
    const now = new Date().toISOString();
    
    if (existing) {
      // Update existing review
      await env.DB.prepare(`
        UPDATE book_reviews 
        SET rating = ?, review = ?, updated_at = ?
        WHERE book_id = ? AND user_email = ?
      `).bind(rating, review, now, bookId, user.email).run();
    } else {
      // Check if user purchased this book
      const purchased = await env.DB.prepare(`
        SELECT id FROM orders 
        WHERE email = ? AND product_id = ? AND status = 'paid'
      `).bind(user.email, bookId).first();
      
      // Insert new review
      await env.DB.prepare(`
        INSERT INTO book_reviews (id, book_id, user_email, user_name, rating, review, verified_purchase, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), bookId, user.email, user.name || "User",
        rating, review, purchased ? 1 : 0, now
      ).run();
    }
    
    // Recalculate average rating for the book
    const avgResult = await env.DB.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total
      FROM book_reviews
      WHERE book_id = ?
    `).bind(bookId).first();
    
    // Update books table with new average
    await env.DB.prepare(`
      UPDATE books 
      SET avg_rating = ?, total_reviews = ?
      WHERE id = ?
    `).bind(avgResult.avg_rating || 0, avgResult.total || 0, bookId).run();
    
    return json({
      ok: true,
      message: existing ? "Rating updated" : "Rating submitted",
      avg_rating: avgResult.avg_rating || 0,
      total_reviews: avgResult.total || 0
    }, 200, cors);
    
  } catch (err) {
    console.error("Submit rating error:", err);
    return json({ ok: false, error: err.message }, 500, cors);
  }
}