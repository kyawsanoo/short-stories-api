import { json } from "../utils/json";
import { fixCover } from "../utils/cover";

export async function freeBooks(request, env, cors) {
  const query = `
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
      b.file,
      a.qr_url as author_qr_url
    FROM books b
    LEFT JOIN authors a ON b.author = a.name
    WHERE b.is_free = 1 OR b.is_free = true
    ORDER BY b.title ASC
  `;

  const res = await env.DB.prepare(query).all();

  const list = (res.results || []).map(b => ({
    id: b.id,
    title: b.title,
    price: 0,
    old_price: null,
    rating: b.avg_rating || 0,
    rating_count: b.total_reviews || 0,
    author: b.author,
    description: b.description,
    cover: fixCover(b.cover),
    category: b.category,
    video: b.video,
    file: b.file,
    author_qr_url: b.author_qr_url || null,
    is_free: true
  }));

  return json(
    {
      ok: true,
      books: list,
      total: list.length
    },
    200,
    cors
  );
}