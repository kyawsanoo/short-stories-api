import { getCors } from "./utils/cors";
import { json } from "./utils/json";

import { books } from "./routes/books";
import { categories } from "./routes/categories";
import { signup } from "./routes/signup";
import { login } from "./routes/login";
import { submit } from "./routes/submit";
import { orderStatus } from "./routes/orderStatus";
import { telegramWebhook } from "./routes/telegramWebhook";
import { invoice } from "./routes/invoice";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    const cors = getCors(origin);

    try {
      // CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: cors
        });
      }

      // ROUTES
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

      if (url.pathname === "/telegram-webhook") {
        return telegramWebhook(request, env);
      }

    
if (url.pathname.startsWith("/invoice/")) {
  return invoice(request, env, cors);
}

      return json(
        { ok: false, error: "route not found" },
        404,
        cors
      );

    } catch (err) {
      console.error("WORKER ERROR:", err);

      return new Response(
        JSON.stringify({
          ok: false,
          error: err.message || "server error"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }
  }
};