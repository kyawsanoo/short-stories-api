import { json } from "../utils/json";

export async function orderStatus(request, env, cors) {
  const form = await request.formData();

  const tx = form.get("tx");

  if (!tx) {
    return json({ ok: false, error: "missing tx" }, 400, cors);
  }

  const order = await env.DB.prepare(`
    SELECT o.*, b.title AS book_title
    FROM orders o
    LEFT JOIN books b ON o.book_id = b.id
    WHERE o.tx = ?
  `)
    .bind(tx)
    .first();

  if (!order) {
    return json({ ok: false, error: "not found" }, 404, cors);
  }

  return json(
    {
      ok: true,
      status: order.status,
      invoice_no: order.id,
      book_title: order.book_title
    },
    200,
    cors
  );
}