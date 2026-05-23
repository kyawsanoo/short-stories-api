import { createSignedUrl } from "../utils/supabase";
import { sendEbookEmail } from "../utils/email";

export async function telegramWebhook(request, env) {
  try {
    const update = await request.json();

    const callback = update.callback_query;
    if (!callback) return new Response("ok");

    const data = callback.data || "";
    const [action, orderId] = data.split(":");

    const callbackQueryId = callback.id;
    const message = callback.message;

    const chatId = message?.chat?.id;

    console.log("WEBHOOK:", action, orderId);

    // =========================
    // 1. LOADING TOAST
    // =========================
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
    // 2. APPROVE / REJECT
    // =========================
    if (action === "approve") {
      status = "paid";
      finalText = "APPROVED";

      try {
        const order = await env.DB.prepare(
          `SELECT o.email, o.book_id, b.title, b.file
           FROM orders o
           LEFT JOIN books b ON o.book_id = b.id
           WHERE o.id = ?`
        ).bind(orderId).first();

        if (order?.file) {
          const downloadLink = await createSignedUrl(order.file, env);

          await sendEbookEmail(
            {
              to: order.email,
              bookTitle: order.title,
              downloadLink
            },
            env
          );
        }
      } catch (e) {
        console.log("EMAIL ERROR:", e);
      }

    } else if (action === "reject") {
      status = "rejected";
      finalText = "REJECTED";
    } else {
      return new Response("ok");
    }

    // =========================
    // 3. UPDATE DB
    // =========================
    try {
      await env.DB.prepare(
        "UPDATE orders SET status = ? WHERE id = ?"
      ).bind(status, orderId).run();
    } catch (e) {
      console.log("DB ERROR:", e);
    }

    // =========================
    // 4. DISABLE BUTTON
    // =========================
    if (chatId && message?.message_id) {
      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageReplyMarkup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
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
    // 5. FINAL TOAST
    // =========================
    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: `${finalText} ✔`,
          show_alert: false
        })
      }
    ).catch(() => {});

    return new Response("ok");
  } catch (err) {
    console.log("WEBHOOK CRASH:", err);

    // NEVER allow Telegram 500 retry loop
    return new Response("ok");
  }
}