import { json } from "../utils/json";
import { fixCover } from "../utils/cover";

export async function books(request, env, cors) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  let query = `
    SELECT id, title, price, author, description, cover, category, video
    FROM books
  `;

  const params = [];

  if (category && category !== "all") {
    query += " WHERE category = ?";
    params.push(category);
  }

  const res = await env.DB.prepare(query)
    .bind(...params)
    .all();

  const list = (res.results || []).map(b => ({
    ...b,
    cover: fixCover(b.cover)
  }));

  return json(
    {
      ok: true,
      books: list
    },
    200,
    cors
  );
}