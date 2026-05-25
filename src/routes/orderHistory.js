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
        o.product_type,
        o.product_id,

        -- Book fields
        b.title AS book_title,
        b.cover AS book_cover,
        b.price AS book_price,
        b.file AS ebook_file,

        -- Video collection fields
        vc.title AS collection_title,
        vc.price AS collection_price,
        vc.thumbnail AS collection_thumbnail,
        vc.file AS collection_file,

        -- Invoice fields
        i.invoice_no,
        i.amount AS invoice_amount,
        i.payment_status,
        i.download_url,
        i.invoice_url

      FROM orders o

      LEFT JOIN books b
        ON o.product_id = b.id AND o.product_type = 'book'

      LEFT JOIN video_collections vc
        ON CAST(o.product_id AS INTEGER) = vc.id AND o.product_type = 'video_collection'

      LEFT JOIN invoices i
        ON o.id = i.order_id

      WHERE LOWER(TRIM(o.email)) = LOWER(TRIM(?))

      ORDER BY o.created_at DESC
    `)
    .bind(user.email)
    .all();

    // Process orders to include product title and download URL based on type
    const orders = (result.results || []).map(o => {
      const isVideoCollection = o.product_type === "video_collection";
      
      // Determine product title
      let productTitle = "";
      let productCover = "";
      let productPrice = 0;
      let downloadUrl = null;
      
      if (isVideoCollection) {
        productTitle = o.collection_title || "Video Collection";
        productCover = o.collection_thumbnail || "";
        productPrice = o.collection_price || o.invoice_amount || 0;
        // For videos, download_url is set when paid
        downloadUrl = o.status === "paid" ? o.download_url : null;
      } else {
        productTitle = o.book_title || "E-Book";
        productCover = o.book_cover || "";
        productPrice = o.book_price || o.invoice_amount || 0;
        // For books, generate ebook URL when paid
        downloadUrl = o.status === "paid" && o.ebook_file ? o.ebook_file : null;
      }
      
      return {
        id: o.id,
        email: o.email,
        tx: o.tx,
        status: o.status,
        created_at: o.created_at,
        product_type: o.product_type,
        product_id: o.product_id,
        product_title: productTitle,
        product_cover: productCover,
        product_price: productPrice,
        invoice_no: o.invoice_no,
        invoice_amount: o.invoice_amount,
        invoice_url: o.invoice_url,  // ← Added invoice_url
        payment_status: o.payment_status,
        download_url: downloadUrl,
        // Keep original fields for backward compatibility
        book_title: o.book_title,
        collection_title: o.collection_title,
        ebook_url: downloadUrl
      };
    });

    return json(
      {
        ok: true,
        orders: orders,
        count: orders.length
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