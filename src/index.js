import { getCors } from "./utils/cors";
import { json } from "./utils/json";

import { books } from "./routes/books";
import { categories } from "./routes/categories";
import { signup } from "./routes/signup";
import { login } from "./routes/login";
import { submit } from "./routes/submit";
import { orderStatus } from "./routes/orderStatus";
import { telegramWebhook } from "./routes/telegramWebhook"; // ✅ ADD THIS

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    const cors = getCors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    if (url.pathname === "/books") {
      return books(request, env, cors);
    }

    if (url.pathname === "/categories") {
      return categories(env, cors);
    }

    if (url.pathname === "/signup") {
      return signup(request, env, cors);
    }

    if (url.pathname === "/login") {
      return login(request, env, cors);
    }

    if (url.pathname === "/submit") {
      return submit(request, env, cors);
    }

    if (url.pathname === "/order-status") {
      return orderStatus(request, env, cors);
    }

    // ✅ FIXED: Telegram webhook route
    if (url.pathname === "/telegram-webhook") {
      return telegramWebhook(request, env);
    }

    return json(
      {
        ok: false,
        error: "route not found"
      },
      404,
      cors
    );
  }
};