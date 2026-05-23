import { json } from "../utils/json";

export async function categories(env, cors) {
  const res = await env.DB.prepare(
    "SELECT * FROM categories ORDER BY sort_order ASC"
  ).all();

  return json(
    {
      ok: true,
      categories: res.results || []
    },
    200,
    cors
  );
}