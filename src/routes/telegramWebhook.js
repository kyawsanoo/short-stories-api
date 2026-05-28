import { sendBookEmail, sendVideoEmail } from "../utils/email";
import { createSignedUrl } from "../utils/supabase";

export async function telegramWebhook(request, env) {
  try {
    const update = await request.json();

    const callback = update.callback_query;
    if (!callback) return new Response("ok");

    const [action, orderId] = (callback.data || "").split(":");

    const callbackQueryId = callback.id;
    const message = callback.message;

    console.log("🔥 CALLBACK:", action, orderId);

    // Telegram loading state
    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: "Processing..."
        })
      }
    ).catch(() => {});

    let status = "";
    let finalText = "";

    // Get order details with product info
    const order = await env.DB.prepare(
      `
      SELECT 
        o.id, 
        o.email, 
        o.tx,
        o.book_id, 
        o.product_type, 
        o.product_id,
        b.title as book_title,
        b.file as book_file,
        vc.title as collection_title,
        vc.file as collection_file
      FROM orders o
      LEFT JOIN books b ON o.book_id = b.id
      LEFT JOIN video_collections vc ON o.product_id = vc.id
      WHERE o.id = ?
      `
    )
      .bind(orderId)
      .first();

    console.log("📦 ORDER:", order);

    if (!order) {
      console.error("Order not found:", orderId);
      return new Response("ok");
    }

    // =========================
    // APPROVE ORDER
    // =========================
    if (action === "approve") {
      status = "paid";
      finalText = "APPROVED";

      let downloadLink = null;
      let productTitle = "";
      let streamingToken = null;
      const isVideoCollection = order.product_type === "video_collection";

      if (isVideoCollection) {
        productTitle = order.collection_title || "Video Collection";
        
        if (order.collection_file) {
          const fileValue = order.collection_file;
          
          if (fileValue.includes('drive.google.com') || 
              fileValue.includes('google.com/uc') ||
              fileValue.startsWith('http')) {
            downloadLink = fileValue;
            console.log("🎬 Using external URL:", downloadLink);
          } else {
            const filePath = `videos/${fileValue}`;
            const bucket = "videos";
            downloadLink = await createSignedUrl(filePath, bucket, env);
            console.log("🎬 Generated signed URL for video collection");
          }
        } else {
          console.error("No file found for video collection:", order.product_id);
        }
        
        // =============================================
        // GENERATE STREAMING ACCESS TOKEN
        // =============================================
        streamingToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 365); // 1 year access
        
        // Create video_access table if not exists (run once)
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS video_access (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            collection_id INTEGER,
            user_email TEXT,
            access_token TEXT,
            expires_at TEXT,
            created_at TEXT
          )
        `).run();
        
        // Store streaming access
        await env.DB.prepare(`
          INSERT INTO video_access (id, order_id, collection_id, user_email, access_token, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), orderId, order.product_id, order.email, 
          streamingToken, expiresAt.toISOString(), new Date().toISOString()
        ).run();
        
        console.log("🎬 Streaming access granted with token:", streamingToken);
      } else {
        productTitle = order.book_title || "E-Book";
        
        if (order.book_file) {
          const filePath = order.book_file;
          const bucket = "ebooks";
          downloadLink = await createSignedUrl(filePath, bucket, env);
          console.log("📚 Generated signed URL for book:", filePath);
        } else {
          console.error("No file found for book:", order.book_id);
        }
      }

      // UPDATE ORDER STATUS
      await env.DB.prepare(
        `UPDATE orders SET status = ? WHERE id = ?`
      ).bind(status, orderId).run();
      console.log("✅ Order status updated to:", status);

      // UPDATE INVOICE
      if (downloadLink) {
        await env.DB.prepare(`
          UPDATE invoices
          SET payment_status = 'paid',
              download_url = ?
          WHERE order_id = ?
        `).bind(downloadLink, orderId).run();
        console.log("✅ Invoice updated with download link");
      } else {
        await env.DB.prepare(`
          UPDATE invoices
          SET payment_status = 'paid'
          WHERE order_id = ?
        `).bind(orderId).run();
        console.log("✅ Invoice payment_status updated");
      }

      // Send email with BOTH download link and streaming link
      if (order?.email) {
        console.log("📧 Preparing to send email to:", order.email);
        
        try {
          if (isVideoCollection) {
  const watchUrl = `https://fundorashop.com/watch?token=${streamingToken}&id=${order.product_id}`;
  await sendVideoEmail({
    to: order.email,
    collectionTitle: productTitle,
    downloadLink: downloadLink,
    watchUrl: watchUrl
  }, env);
  console.log("🎬 Video email sent to:", order.email);
} else {
            await sendBookEmail({
              to: order.email,
              bookTitle: productTitle,
              downloadLink: downloadLink
            }, env);
            console.log("📚 Book email sent to:", order.email);
          }
        } catch (emailError) {
          console.error("❌ Failed to send email:", emailError);
        }
      }
    }

    // =========================
    // REJECT ORDER
    // =========================
    else if (action === "reject") {
      status = "rejected";
      finalText = "REJECTED";
      
      await env.DB.prepare(
        "UPDATE orders SET status = ? WHERE id = ?"
      ).bind(status, orderId).run();
      console.log("✅ Order status updated to rejected");
      
      await env.DB.prepare(
        "UPDATE invoices SET payment_status = ? WHERE order_id = ?"
      ).bind(status, orderId).run();
      console.log("✅ Invoice payment_status updated to rejected");
    } else {
      return new Response("ok");
    }

    // Disable Telegram buttons
    if (message?.chat?.id && message?.message_id) {
      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageReplyMarkup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            message_id: message.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: `✅ ${finalText}`,
                    callback_data: "done"
                  }
                ]
              ]
            }
          })
        }
      ).catch(() => {});
    }

    // Final Telegram response
    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: `${finalText} ✔`
        })
      }
    ).catch(() => {});

    return new Response("ok");
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return new Response("ok");
  }
}