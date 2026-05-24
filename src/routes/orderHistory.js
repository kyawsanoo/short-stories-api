import { json } from "../utils/json";
import { requireUser } from "../utils/auth";

export async function orderHistory(request, env, cors) {

  const auth = await requireUser(request, env, cors);

  if (auth.error) {
    return json(
      { ok: false, error: auth.error },
      auth.status,
      cors
    );
  }

  const user = auth.user;

  const result = await env.DB.prepare(`
    SELECT id, book_id, status, tx, created_at
    FROM orders
    WHERE email = ?
    ORDER BY created_at DESC
  `)
  .bind(user.email)
  .all();

  return json({
    ok: true,
    user: user.email,
    orders: result.results || []
  }, 200, cors);
}