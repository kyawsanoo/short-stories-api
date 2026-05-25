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
    // DB SEARCH (UPDATED for books and video collections)
    // ======================
    const result = await env.DB.prepare(`
      SELECT 
        o.id,
        o.email,
        o.tx,
        o.status AS order_status,
        o.created_at,
        o.product_type,
        o.product_id,
        i.invoice_no,
        i.payment_status,
        i.amount,
        i.download_url,
        i.invoice_url,
        b.title AS book_title,
        b.cover AS book_cover,
        vc.title AS collection_title,
        vc.thumbnail AS collection_thumbnail
      FROM orders o
      LEFT JOIN invoices i ON i.order_id = o.id
      LEFT JOIN books b ON o.product_id = b.id AND o.product_type = 'book'
      LEFT JOIN video_collections vc ON CAST(o.product_id AS INTEGER) = vc.id AND o.product_type = 'video_collection'
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
    // Determine product type and title
    // ======================
    const isVideoCollection = result.product_type === "video_collection";
    let productTitle = "";
    let productCover = "";
    
    if (isVideoCollection) {
      productTitle = result.collection_title || "Video Collection";
      productCover = result.collection_thumbnail || "";
    } else {
      productTitle = result.book_title || "E-Book";
      productCover = result.book_cover || "";
    }

    const finalStatus = result.payment_status || result.order_status || "pending";
    const isPaid = finalStatus === "paid";
    const orderDate = result.created_at ? new Date(result.created_at).toLocaleDateString() : null;

    // ======================
    // SUCCESS (UPDATED response)
    // ======================
    return json(
      {
        ok: true,
        order: {
          id: result.id,
          email: result.email,
          tx: result.tx,
          created_at: result.created_at,
          order_date: orderDate,
          product_type: result.product_type,
          product_id: result.product_id
        },
        product: {
          title: productTitle,
          cover: productCover,
          type: isVideoCollection ? "video_collection" : "book",
          type_label: isVideoCollection ? "Video Collection" : "E-Book"
        },
        book_title: productTitle,
        collection_title: result.collection_title,
        status: finalStatus,
        is_paid: isPaid,
        invoice_no: result.invoice_no || null,
        invoice_url: result.invoice_url || null,
        amount: result.amount || 0,
        download_url: isPaid ? result.download_url : null
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
        error: "Server error. Please try again later."
      },
      500,
      {
        ...cors,
        "Content-Type": "application/json"
      }
    );
  }
}