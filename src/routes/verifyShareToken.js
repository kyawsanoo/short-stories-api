import { json } from "../utils/json";

export async function verifyShareToken(request, env, cors) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  
  // Support both 'collection_id' (videos) and 'id' (books)
  const collectionId = url.searchParams.get("collection_id");
  let productId = url.searchParams.get("id") || url.searchParams.get("product_id");
  
  // Determine product type from URL path or parameters
  const productType = url.searchParams.get("product_type") || 
                      (collectionId ? "video_collection" : 
                       (productId ? "book" : null));
  
  console.log("Verify share token:", { token, collectionId, productId, productType });
  
  if (!token) {
    return json({ valid: false, message: "Missing token" }, 200, cors);
  }
  
  // =============================================
  // SIMPLIFIED: Just use productId as-is (no slug resolution)
  // =============================================
  let actualProductId = productId;
  
  if (productType === "book" && productId) {
    // Just verify the book exists (optional)
    const book = await env.DB.prepare(
      "SELECT id FROM books WHERE id = ?"
    ).bind(productId).first();
    
    if (!book) {
      return json({ valid: false, message: "Book not found" }, 200, cors);
    }
    console.log(`Using book ID: "${productId}"`);
  }
  
  // Try to find by collection_id (videos) or product_id (books)
  let shareToken = null;
  
  if (collectionId) {
    // Video collection share token
    shareToken = await env.DB.prepare(`
      SELECT * FROM share_tokens 
      WHERE token = ? AND collection_id = ? AND expires_at > datetime('now') AND is_active = 1
    `).bind(token, collectionId).first();
  } 
  else if (actualProductId) {
    // Book share token (using product_id directly)
    shareToken = await env.DB.prepare(`
      SELECT * FROM share_tokens 
      WHERE token = ? AND product_id = ? AND product_type = ? 
      AND expires_at > datetime('now') AND is_active = 1
      AND (max_uses IS NULL OR usage_count < max_uses)
    `).bind(token, actualProductId, productType).first();
    
    // Fallback: try without product_type (for backward compatibility)
    if (!shareToken) {
      shareToken = await env.DB.prepare(`
        SELECT * FROM share_tokens 
        WHERE token = ? AND product_id = ? 
        AND expires_at > datetime('now') AND is_active = 1
        AND (max_uses IS NULL OR usage_count < max_uses)
      `).bind(token, actualProductId).first();
    }
  }
  
  if (!shareToken) {
    return json({ valid: false, message: "Link expired or invalid" }, 200, cors);
  }
  
  // Increment usage count (only if max_uses is not NULL)
  if (shareToken.max_uses !== null) {
    await env.DB.prepare(`
      UPDATE share_tokens SET usage_count = usage_count + 1 WHERE token = ?
    `).bind(token).run();
  }
  
  // Get the actual book data if requested
  let bookData = null;
  if (url.searchParams.get("include_book") === "true" && actualProductId) {
    bookData = await env.DB.prepare(
      "SELECT id, title, slug, content, description, cover_image FROM books WHERE id = ?"
    ).bind(actualProductId).first();
  }
  
  return json({ 
    valid: true, 
    expires_at: shareToken.expires_at,
    usage_count: (shareToken.usage_count || 0) + 1,
    max_uses: shareToken.max_uses,
    product_type: shareToken.product_type || (shareToken.collection_id ? "video_collection" : "book"),
    actual_product_id: actualProductId,
    book: bookData
  }, 200, cors);
}