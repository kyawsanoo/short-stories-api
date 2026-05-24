import { json } from "../utils/json";

export async function orderStatus(request, env, cors) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim();

    // ======================
    // 400: missing input
    // ======================
    if (!query) {
      return json(
        {
          ok: false,
          error: "Please enter Order ID or Invoice ID"
        },
        400,
        cors
      );
    }

    // ======================
    // DB SEARCH
    // ======================
    const result = await env.DB.prepare(`
      SELECT 
        o.id,
        o.email,
        o.status AS order_status,
        i.invoice_no,
        i.payment_status,
        b.title
      FROM orders o
      LEFT JOIN invoices i ON i.order_id = o.id
      LEFT JOIN books b ON o.book_id = b.id
      WHERE CAST(o.id AS TEXT) = ?
         OR i.invoice_no = ?
      LIMIT 1
    `)
    .bind(query, query)
    .first();

    // ======================
    // 404 (ALWAYS SAFE JSON)
    // ======================
    if (!result) {
      return json(
        {
          ok: false,
          error: "No order or invoice found with this ID"
        },
        404,
        {
          ...cors,
          "Content-Type": "application/json"
        }
      );
    }

    // ======================
    // SUCCESS
    // ======================
    return json(
      {
        ok: true,
        order: {
          id: result.id,
          email: result.email
        },
        book_title: result.title,
        status: result.payment_status || result.order_status,
        invoice_no: result.invoice_no || null
      },
      200,
      {
        ...cors,
        "Content-Type": "application/json"
      }
    );

  } catch (err) {
    console.error("ORDER STATUS ERROR:", err);

    // ======================
    // CRITICAL: NEVER BREAK JSON
    // ======================
    return json(
      {
        ok: false,
        error: "Server error"
      },
      500,
      {
        ...cors,
        "Content-Type": "application/json"
      }
    );
  }
}