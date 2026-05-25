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
      const isVideoCollection = order.product_type === "video_collection";

      if (isVideoCollection) {
        // Handle Video Collection - ZIP file from 'videos' bucket
        productTitle = order.collection_title || "Video Collection";
        
        if (order.collection_file) {
          const filePath = order.collection_file; // 'videos_poems.zip'
          const bucket = "videos";
          downloadLink = await createSignedUrl(filePath, bucket, env);
          console.log("🎬 Video collection file:", filePath, "from bucket:", bucket);
        } else {
          console.error("No file found for video collection:", order.product_id);
        }
      } else {
        // Handle Book - PDF file from 'ebooks' bucket
        productTitle = order.book_title || "E-Book";
        
        if (order.book_file) {
          const filePath = order.book_file; // 'DreamOfARadiculousMan.pdf'
          const bucket = "ebooks";
          downloadLink = await createSignedUrl(filePath, bucket, env);
          console.log("📚 Book file:", filePath, "from bucket:", bucket);
        } else {
          console.error("No file found for book:", order.book_id);
        }
      }

      // Update order status
      await env.DB.prepare(
        `UPDATE orders SET status = ? WHERE id = ?`
      )
        .bind(status, orderId)
        .run();

      // Update invoice with download link
      if (downloadLink) {
        await env.DB.prepare(
          `
          UPDATE invoices
          SET payment_status = 'paid',
              download_url = ?
          WHERE order_id = ?
          `
        )
          .bind(downloadLink, orderId)
          .run();
      }

      // Send email with download link
      if (order?.email && downloadLink) {
        console.log("📧 Preparing to send email:", {
          to: order.email,
          productTitle: productTitle,
          isVideoCollection: isVideoCollection
        });
        
        try {
          if (isVideoCollection) {
            // Send video collection email
            await sendVideoEmail(
              {
                to: order.email,
                collectionTitle: productTitle,
                downloadLink: downloadLink
              },
              env
            );
            console.log("🎬 Video email sent to:", order.email);
          } else {
            // Send book email
            await sendBookEmail(
              {
                to: order.email,
                bookTitle: productTitle,
                downloadLink: downloadLink
              },
              env
            );
            console.log("📚 Book email sent to:", order.email);
          }
        } catch (emailError) {
          console.error("❌ Failed to send email:", emailError);
        }
      } else {
        console.log("⚠️ Email not sent - missing:", {
          hasEmail: !!order?.email,
          hasDownloadLink: !!downloadLink
        });
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
      )
        .bind(status, orderId)
        .run();
        
      await env.DB.prepare(
        "UPDATE invoices SET payment_status = ? WHERE order_id = ?"
      )
        .bind(status, orderId)
        .run();
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