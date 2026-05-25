export async function sendOrderToTelegram(order, env) {
  try {
    console.log("📤 Sending to Telegram:", order);
    
    // Determine product type
    const productType = order.product_type || "book";
    const isVideoCollection = productType === "video_collection";
    
    const productIcon = isVideoCollection ? "🎬" : "📚";
    const productTypeLabel = isVideoCollection ? "VIDEO COLLECTION" : "E-BOOK";
    
    // Get product title
    let productTitle = order.product_title || order.book_title;
    
    if (!productTitle || productTitle === "Unknown" || productTitle === "undefined") {
      try {
        if (isVideoCollection) {
          const collection = await env.DB.prepare(
            "SELECT title FROM video_collections WHERE id = ?"
          ).bind(order.product_id).first();
          productTitle = collection?.title || `Video Collection (${order.product_id})`;
        } else {
          const book = await env.DB.prepare(
            "SELECT title FROM books WHERE id = ?"
          ).bind(order.book_id || order.product_id).first();
          productTitle = book?.title || `Book (${order.book_id || order.product_id})`;
        }
      } catch (dbErr) {
        console.error("Error fetching product title:", dbErr);
        productTitle = isVideoCollection ? "Video Collection" : "E-Book";
      }
    }
    
    // Format price display
    let priceText = `💰 Amount: ${order.amount} MMK`;
    if (order.old_price) {
      priceText = `💰 Price: ${order.amount} MMK (Was: ${order.old_price} MMK)`;
    }
    
    const message = `
${productIcon} NEW ${productTypeLabel} ORDER

📦 Product: ${productTitle}
📧 Email: ${order.email}
💳 TX: ${order.tx}
🆔 Order ID: ${order.id}
${priceText}
📅 Time: ${new Date().toLocaleString()}
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

    const result = await res.json();
    console.log("Telegram response:", result);
    return result;

  } catch (err) {
    console.error("Telegram send error:", err);
    // Don't throw - just return a failed response
    return { ok: false, error: err.message };
  }
}