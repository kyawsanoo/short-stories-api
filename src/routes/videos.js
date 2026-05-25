import { json } from "../utils/json";

export async function videos(request, env, cors) {
  const url = new URL(request.url);
  const id = url.searchParams.get("collection_id");

  if (!id) {
    return json({ ok: false, error: "collection_id required" }, 400, cors);
  }

  const result = await env.DB.prepare(`
    SELECT * FROM videos
    WHERE collection_id = ?
    ORDER BY position ASC
  `).bind(id).all();

  return json({ ok: true, data: result.results }, 200, cors);
}