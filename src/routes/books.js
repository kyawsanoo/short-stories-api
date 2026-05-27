import { json } from "../utils/json";
import { fixCover } from "../utils/cover";

export async function books(request, env, cors) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const author = url.searchParams.get("author");

  let query = `
    SELECT 
      b.id, 
      b.title, 
      b.price, 
      b.old_price,
      b.avg_rating,
      b.total_reviews,
      b.author, 
      b.description, 
      b.cover, 
      b.category, 
      b.video,
      a.qr_url as author_qr_url
    FROM books b
    LEFT JOIN authors a ON b.author = a.name
    WHERE 1=1
  `;

  const params = [];

  if (category && category !== "all") {
    query += " AND b.category = ?";
    params.push(category);
  }

  if (author && author !== "all") {
    query += " AND b.author = ?";
    params.push(author);
  }

  // Optional: Add sorting
  query += " ORDER BY b.title ASC";

  const res = await env.DB.prepare(query)
    .bind(...params)
    .all();

  const list = (res.results || []).map(b => ({
    id: b.id,
    title: b.title,
    price: b.price,
    old_price: b.old_price || null,
    rating: b.avg_rating || 0,
    rating_count: b.total_reviews || 0,
    author: b.author,
    description: b.description,
    cover: fixCover(b.cover),
    category: b.category,
    video: b.video,
    author_qr_url: b.author_qr_url || null
  }));

  return json(
    {
      ok: true,
      books: list,
      filters: {
        category: category || "all",
        author: author || "all",
        total: list.length
      }
    },
    200,
    cors
  );
}