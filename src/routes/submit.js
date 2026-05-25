import { json } from "../utils/json";
import { sendOrderToTelegram } from "../utils/telegram";

export async function submit(request, env, cors) {
  try {
    const form = await request.formData();

    const email = form.get("email");
    const tx = form.get("tx");

    // =========================
    // OLD SYSTEM (LIVE SUPPORT)
    // =========================
    const legacyBookId = form.get("book");

    // =========================
    // NEW SYSTEM (FUTURE SUPPORT)
    // =========================
    let productType = form.get("product_type");
    let productId = form.get("product_id");

    console.log("=== SUBMIT DEBUG ===");
    console.log("Email:", email);
    console.log("TX:", tx);
    console.log("Product Type:", productType);
    console.log("Product ID:", productId);

    // =========================
    // VALIDATION
    // =========================
    if (!email || !tx) {
      return json(
        { ok: false, error: "missing fields" },
        400,
        cors
      );
    }

    // =========================
    // AUTO MIGRATION LOGIC
    // =========================
    if (!productType || !productId) {
      if (legacyBookId) {
        productType = "book";
        productId = legacyBookId;
      }
    }

    if (!productType || !productId) {
      return json(
        { ok: false, error: "missing product data" },
        400,
        cors
      );
    }

    // =========================
    // DUPLICATE TX CHECK
    // =========================
    const exists = await env.DB.prepare(
      "SELECT id FROM orders WHERE tx = ?"
    ).bind(tx).first();

    if (exists) {
      return json(
        { ok: false, error: "tx already used" },
        409,
        cors
      );
    }

    // =========================
    // GET PRODUCT INFO
    // =========================
    let productTitle = "Unknown";
    let productPrice = 0;
    let productOldPrice = null;

    if (productType === "book") {
      const product = await env.DB.prepare(
        "SELECT title, price FROM books WHERE id = ?"
      ).bind(productId).first();
      
      if (product) {
        productTitle = product.title;
        productPrice = product.price;
        console.log("📚 Book found:", { title: productTitle, price: productPrice });
      } else {
        console.error("Book not found:", productId);
        return json(
          { ok: false, error: "Book not found" },
          404,
          cors
        );
      }
    } 
    else if (productType === "video_collection") {
      // Convert to number for INTEGER ID
      const videoId = parseInt(productId, 10);
      const product = await env.DB.prepare(
        "SELECT title, price, old_price FROM video_collections WHERE id = ?"
      ).bind(videoId).first();
      
      if (product) {
        productTitle = product.title;
        productPrice = product.price;
        productOldPrice = product.old_price;
        console.log("🎬 Video collection found:", { 
          title: productTitle, 
          price: productPrice, 
          oldPrice: productOldPrice 
        });
      } else {
        console.error("Video collection not found for ID:", videoId);
        return json(
          { ok: false, error: "Video collection not found" },
          404,
          cors
        );
      }
    }

    const orderId = crypto.randomUUID();
    const invoiceId = crypto.randomUUID();
    const invoiceNo = "INV-" + Math.random().toString(16).slice(2, 10).toUpperCase();

    console.log("Order ID:", orderId);
    console.log("Invoice No:", invoiceNo);
    console.log("Amount:", productPrice);

    // =========================
    // INSERT ORDER
    // =========================
    await env.DB.prepare(`
      INSERT INTO orders (
        id,
        email,
        tx,
        status,
        created_at,
        book_id,
        product_type,
        product_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId,
      email,
      tx,
      "pending",
      new Date().toISOString(),
      productType === "book" ? productId : null,  // NULL for video collections
      productType,
      productType === "video_collection" ? parseInt(productId, 10) : productId
    ).run();

    console.log("✅ Order inserted");

    // =========================
    // INSERT INVOICE (with placeholder for video collection book_id)
    // =========================
    // For video collections, use a placeholder to satisfy NOT NULL constraint
    const bookIdValue = (productType === "book") ? productId : 'video_no_book_placeholder';
    
    await env.DB.prepare(`
      INSERT INTO invoices (
        id,
        order_id,
        invoice_no,
        email,
        book_id,
        product_type,
        product_id,
        amount,
        payment_status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceId,
      orderId,
      invoiceNo,
      email,
      bookIdValue,  // Placeholder for video collections
      productType,
      productType === "video_collection" ? parseInt(productId, 10) : productId,
      productPrice,
      "pending",
      new Date().toISOString()
    ).run();

    console.log("✅ Invoice inserted");

    // =========================
    // VERIFY INVOICE WAS INSERTED
    // =========================
    const verifyInvoice = await env.DB.prepare(
      "SELECT id, invoice_no FROM invoices WHERE id = ?"
    ).bind(invoiceId).first();

    if (!verifyInvoice) {
      console.error("❌ Invoice verification failed!");
      return json(
        { ok: false, error: "Failed to create invoice" },
        500,
        cors
      );
    }
    console.log("✅ Invoice verified:", verifyInvoice);

    // =========================
    // TELEGRAM NOTIFY
    // =========================
    try {
      await sendOrderToTelegram(
        {
          id: orderId,
          email,
          tx,
          product_type: productType,
          product_id: productId,
          product_title: productTitle,
          book_title: productTitle,
          amount: productPrice,
          old_price: productOldPrice
        },
        env
      );
      console.log("✅ Telegram notification sent");
    } catch (telegramErr) {
      console.error("❌ Telegram error (non-fatal):", telegramErr);
      // Don't fail the order if Telegram fails
    }

    // =========================
    // RESPONSE
    // =========================
    return json(
      {
        ok: true,
        order_id: orderId,
        invoice_no: invoiceNo,
        product_title: productTitle,
        product_type: productType,
        amount: productPrice
      },
      200,
      cors
    );

  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    console.error("Error stack:", err.stack);

    return json(
      {
        ok: false,
        error: "server error",
        details: err?.message || String(err)
      },
      500,
      cors
    );
  }
}