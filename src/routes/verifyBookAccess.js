import { json } from "../utils/json";
import { createSignedUrl } from "../utils/supabase";

export async function verifyBookAccess(request, env, cors) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const bookId = url.searchParams.get("book_id");
  
  if (!token || !bookId) {
    return json({ hasAccess: false, message: "Missing token or book ID" }, 200, cors);
  }
  
  // Check access
  const access = await env.DB.prepare(`
    SELECT ba.*, b.title, b.file
    FROM book_access ba
    JOIN books b ON ba.book_id = b.id
    WHERE ba.access_token = ? AND ba.book_id = ? AND ba.expires_at > datetime('now')
  `).bind(token, bookId).first();
  
  if (!access) {
    return json({ hasAccess: false, message: "Invalid or expired access" }, 200, cors);
  }
  
  // Generate signed URL for PDF
  const pdfUrl = await createSignedUrl(access.file, "ebooks", env);
  
  return json({
    hasAccess: true,
    book_title: access.title,
    download_url: pdfUrl,
    pdf_url: pdfUrl,
    expires_at: access.expires_at
  }, 200, cors);
}