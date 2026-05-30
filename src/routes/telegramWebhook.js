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

    // Get order details with product info (include user_id if already set)
    const order = await env.DB.prepare(`
      SELECT 
        o.id, 
        o.email, 
        o.user_id,
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
    `).bind(orderId).first();

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
      let bookAccessToken = null;
      const isVideoCollection = order.product_type === "video_collection";

      // ----------------------------
      // 1. Determine user_id (if missing)
      // ----------------------------
      let userId = order.user_id;
      if (!userId && order.email) {
        try {
          const user = await env.DB.prepare(
            "SELECT id FROM users WHERE email = ?"
          ).bind(order.email).first();
          userId = user?.id;
        } catch (err) {
          console.error("Error looking up user by email:", err);
        }
      }

      // Update orders.user_id if it was missing
      if (userId && !order.user_id) {
        await env.DB.prepare(
          "UPDATE orders SET user_id = ? WHERE id = ?"
        ).bind(userId, orderId).run();
        console.log("✅ Updated orders.user_id for order", orderId);
      }

      // Update invoices.user_id (if invoice exists)
      if (userId) {
        await env.DB.prepare(
          "UPDATE invoices SET user_id = ? WHERE order_id = ?"
        ).bind(userId, orderId).run();
        console.log("✅ Updated invoices.user_id for order", orderId);
      }

      // ----------------------------
      // 2. Process video or book
      // ----------------------------
      if (isVideoCollection) {
        console.log("🎬 PROCESSING VIDEO ORDER:", orderId);
        
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
        
        // Generate session_id and token
        const sessionId = crypto.randomUUID();
        streamingToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 365);
        
        await env.DB.prepare(`
          INSERT INTO video_access (id, order_id, collection_id, user_email, expires_at, created_at, access_token, user_id, session_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          orderId,
          parseInt(order.product_id),
          order.email,
          expiresAt.toISOString(),
          new Date().toISOString(),
          streamingToken,
          userId,
          sessionId
        ).run();
        
        console.log("✅ Video access token created:", streamingToken);
        console.log("👤 Bound to user:", userId || "none");
        console.log("🔑 Session ID:", sessionId);
        
      } else {
        // BOOK ORDER
        productTitle = order.book_title || "E-Book";
        
        if (order.book_file) {
          const filePath = order.book_file;
          const bucket = "ebooks";
          downloadLink = await createSignedUrl(filePath, bucket, env);
          console.log("📚 Generated signed URL for book:", filePath);
          
          bookAccessToken = crypto.randomUUID();
          const bookExpiresAt = new Date();
          bookExpiresAt.setDate(bookExpiresAt.getDate() + 365);
          
          // Ensure book_access table exists
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS book_access (
              id TEXT PRIMARY KEY,
              order_id TEXT,
              book_id TEXT,
              user_email TEXT,
              user_id TEXT,
              access_token TEXT UNIQUE,
              expires_at TEXT,
              created_at TEXT
            )
          `).run();
          
          await env.DB.prepare(`
            INSERT INTO book_access (id, order_id, book_id, user_email, user_id, access_token, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(), orderId, order.book_id, order.email,
            userId,
            bookAccessToken, bookExpiresAt.toISOString(), new Date().toISOString()
          ).run();
          
          console.log("📚 Book online reader access granted with token:", bookAccessToken);
        } else {
          console.error("No file found for book:", order.book_id);
        }
      }

      // UPDATE ORDER STATUS
      await env.DB.prepare(
        "UPDATE orders SET status = ? WHERE id = ?"
      ).bind(status, orderId).run();
      console.log("✅ Order status updated to:", status);

      // UPDATE INVOICE (payment status and download URL)
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

      // Send email
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
            const readerUrl = `https://fundorashop.com/reader.html?token=${bookAccessToken}&id=${order.book_id}`;
            await sendBookEmail({
              to: order.email,
              bookTitle: productTitle,
              downloadLink: downloadLink,
              readerUrl: readerUrl
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