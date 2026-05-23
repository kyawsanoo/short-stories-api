export async function sendOrderToTelegram(order, env) {
  const message = `
🛒 NEW ORDER

📦 Book: ${order.book_title}
📧 Email: ${order.email}
💳 TX: ${order.tx}
🆔 Order: ${order.id}
`;

  const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;

  const res = await fetch(telegramUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: env.ADMIN_CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Approve",
              callback_data: `approve:${order.id}`
            },
            {
              text: "❌ Reject",
              callback_data: `reject:${order.id}`
            }
          ]
        ]
      }
    })
  });

  return await res.json();
}