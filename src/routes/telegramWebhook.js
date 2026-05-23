import { sendEbookEmail } from "../utils/email";
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

    // Telegram loading
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

    // =========================
    // APPROVE ORDER
    // =========================
    if (action === "approve") {
      status = "paid";
      finalText = "APPROVED";

      const order = await env.DB.prepare(
        `SELECT o.email, o.book_id, b.title, b.file
         FROM orders o
         LEFT JOIN books b ON o.book_id = b.id
         WHERE o.id = ?`
      )
        .bind(orderId)
        .first();

      console.log("📦 ORDER:", order);

      if (order?.email && order?.file) {
        console.log("📧 Generating signed URL...");

        // ✅ FIX: proper Supabase signed URL
        const downloadLink = await createSignedUrl(order.file, env);

        console.log("🔗 Signed URL:", downloadLink);

        await sendEbookEmail(
          {
            to: order.email,
            bookTitle: order.title,
            downloadLink
          },
          env
        );

        console.log("📨 Email sent");
      } else {
        console.log("⚠️ Missing email or file");
      }
    }

    // =========================
    // REJECT ORDER
    // =========================
    else if (action === "reject") {
      status = "rejected";
      finalText = "REJECTED";
    } else {
      return new Response("ok");
    }

    // =========================
    // UPDATE DB
    // =========================
    await env.DB.prepare(
      "UPDATE orders SET status = ? WHERE id = ?"
    )
      .bind(status, orderId)
      .run();

    // =========================
    // Disable buttons
    // =========================
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
                    text: `DONE: ${finalText}`,
                    callback_data: "done"
                  }
                ]
              ]
            }
          })
        }
      ).catch(() => {});
    }

    // =========================
    // Final toast
    // =========================
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
    console.log("WEBHOOK ERROR:", err);
    return new Response("ok");
  }
}