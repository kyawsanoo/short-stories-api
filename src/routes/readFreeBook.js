import { json } from "../utils/json";

export async function readFreeBook(request, env, cors) {
  const url = new URL(request.url);
  const bookId = url.pathname.split('/').pop();
  
  const book = await env.DB.prepare(`
    SELECT id, file, is_free, title
    FROM books 
    WHERE id = ? AND (is_free = 1 OR is_free = true)
  `).bind(bookId).first();
  
  if (!book) {
    return json({ ok: false, error: 'Free book not found' }, 404, cors);
  }
  
  if (!book.file) {
    return json({ ok: false, error: 'Book file not available' }, 404, cors);
  }
  
  const { createSignedUrl } = await import("../utils/supabase.js");
  const signedUrl = await createSignedUrl(book.file, "ebooks", env);
  
  // Return JSON with PDF URL
  return json({
    ok: true,
    pdfUrl: signedUrl,
    title: book.title
  }, 200, cors);
}