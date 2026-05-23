import { json } from "../utils/json";

export async function orderStatus(request, env, cors) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId) {
      return json(
        { ok: false, error: "Please enter Order ID" },
        400,
        cors
      );
    }

    const order = await env.DB.prepare(
      `
      SELECT id, email, book_id, status, created_at
      FROM orders
      WHERE id = ?
      `
    )
      .bind(orderId)
      .first();

    if (!order) {
      return json(
        { ok: false, error: "Order not found" },
        404,
        cors
      );
    }

    return json(
      {
        ok: true,
        order: {
          id: order.id,
          email: order.email,
          book_id: order.book_id,
          status: order.status,
          created_at: order.created_at
        }
      },
      200,
      cors
    );

  } catch (err) {
    console.error("ORDER STATUS ERROR:", err);

    return json(
      { ok: false, error: "Server error" },
      500,
      cors
    );
  }
}