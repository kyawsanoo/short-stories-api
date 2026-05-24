import { json } from "../utils/json";
import { requireUser } from "../utils/auth";

export async function orderHistory(request, env, cors) {
  try {
    const auth = await requireUser(request, env, cors);

    if (auth?.error) {
      return json(
        { ok: false, error: auth.error },
        auth.status,
        cors
      );
    }

    const user = auth.user;

    if (!user?.email) {
      return json(
        { ok: false, error: "Invalid user session" },
        401,
        cors
      );
    }

    const result = await env.DB.prepare(`
      SELECT
        o.id,
        o.email,
        o.tx,
        o.status,
        o.created_at,

        b.title AS book_title,
        b.cover AS book_cover,
        b.price AS book_price,
        b.file AS ebook_file,

        i.invoice_no,
        i.amount AS invoice_amount,
        i.payment_status

      FROM orders o

      LEFT JOIN books b
        ON o.book_id = b.id

      LEFT JOIN invoices i
        ON o.id = i.order_id

      WHERE LOWER(TRIM(o.email)) = LOWER(TRIM(?))

      ORDER BY o.created_at DESC
    `)
    .bind(user.email)
    .all();

    // 🔥 inject ebook access rule
    const orders = (result.results || []).map(o => ({
      ...o,
      ebook_url: o.status === "paid" ? o.ebook_file : null
    }));

    return json(
      {
        ok: true,
        orders
      },
      200,
      cors
    );

  } catch (err) {
    console.error("ORDER HISTORY ERROR:", err?.stack || err);

    return json(
      {
        ok: false,
        error: "Failed to load order history",
        details: err?.message || String(err)
      },
      500,
      cors
    );
  }
}