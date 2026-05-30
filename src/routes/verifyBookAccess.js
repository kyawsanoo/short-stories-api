import { json } from "../utils/json";
import { createSignedUrl } from "../utils/supabase";

export async function verifyBookAccess(request, env, cors) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const bookId = url.searchParams.get("book_id");

  if (!token || !bookId) {
    return json({ hasAccess: false, message: "Missing token or book ID" }, 200, cors);
  }

  // Get the access record, including user_id
  const access = await env.DB.prepare(`
    SELECT ba.*, b.title, b.file
    FROM book_access ba
    JOIN books b ON ba.book_id = b.id
    WHERE ba.access_token = ? AND ba.book_id = ? AND ba.expires_at > datetime('now')
  `).bind(token, bookId).first();

  if (!access) {
    return json({ hasAccess: false, message: "Invalid or expired access" }, 200, cors);
  }

  // --- User binding logic ---
  // Get logged-in user from Authorization header
  const authHeader = request.headers.get("Authorization");
  let currentUserId = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const userToken = authHeader.slice(7);
    // Try common column names (session_token or token)
    let user = await env.DB.prepare(
      "SELECT id FROM users WHERE session_token = ?"
    ).bind(userToken).first();
    if (!user) {
      user = await env.DB.prepare(
        "SELECT id FROM users WHERE token = ?"
      ).bind(userToken).first();
    }
    currentUserId = user?.id;
  }

  // If the access record has a user_id, enforce ownership
  if (access.user_id) {
    if (!currentUserId) {
      return json({
        hasAccess: false,
        login_required: true,
        message: "Please log in to read this book."
      }, 200, cors);
    }
    if (currentUserId !== access.user_id) {
      return json({
        hasAccess: false,
        message: "This book belongs to another user. Access denied."
      }, 200, cors);
    }
  } else {
    // Old token without user_id – require login and bind to current user
    if (!currentUserId) {
      return json({
        hasAccess: false,
        login_required: true,
        message: "Please log in to read this book."
      }, 200, cors);
    }
    // Bind this token to the current user for future requests
    await env.DB.prepare(
      "UPDATE book_access SET user_id = ? WHERE access_token = ?"
    ).bind(currentUserId, token).run();
  }
  // --- End of user binding ---

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