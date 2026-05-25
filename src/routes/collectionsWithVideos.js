import { json } from "../utils/json";

export async function collectionsWithVideos(request, env, cors) {
  const collections = await env.DB.prepare(`
    SELECT * FROM video_collections ORDER BY id DESC
  `).all();

  const data = [];

  for (const col of collections.results) {
    const videos = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE collection_id = ?
      ORDER BY position ASC
    `).bind(col.id).all();

    data.push({
      ...col,
      videos: videos.results
    });
  }

  return json({ ok: true, data }, 200, cors);
}