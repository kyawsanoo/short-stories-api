import { json } from "../utils/json";

export async function videoCollections(request, env, cors) {
  const result = await env.DB.prepare(`
    SELECT * FROM video_collections ORDER BY id DESC
  `).all();

  return json({ ok: true, data: result.results }, 200, cors);
}