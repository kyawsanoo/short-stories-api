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
import { orderHistory } from "./routes/orderHistory";
import { logout } from "./routes/logout";

import { videoCollections } from "./routes/videoCollections";
import { videos } from "./routes/videos";
import { collectionsWithVideos } from "./routes/collectionsWithVideos";


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

      // Normalize path (IMPORTANT FIX)
      const path = url.pathname.replace(/\/$/, ""); // removes trailing slash

      console.log("PATH:", path);
      console.log("METHOD:", request.method);

      // ROUTES
      if (path === "/books") {
        return books(request, env, cors);
      }

      if (path === "/categories") {
        return categories(env, cors);
      }

      if (path === "/signup") {
        return signup(request, env, cors);
      }

      if (path === "/login") {
        return login(request, env, cors);
      }

      if (path === "/submit") {
        return submit(request, env, cors);
      }

      if (path === "/order-status") {
        return orderStatus(request, env, cors);
      }

      if (path === "/telegram-webhook") {
        return telegramWebhook(request, env);
      }

      if (path.startsWith("/invoice/")) {
        return invoice(request, env, cors);
      }

      if (path === "/order-history" && request.method === "GET") {
        return orderHistory(request, env, cors);
      }

      if (path === "/logout" && request.method === "POST") {
        return logout(request, env, cors);
      }

      
      if (path === "/video-collections") {
        return videoCollections(request, env, cors);
      }

      if (path === "/videos") {
        return videos(request, env, cors);
      }

      if (path === "/collections-with-videos") {
        return collectionsWithVideos(request, env, cors);
      }
      

      // DEBUG RESPONSE (better than silent failure)
      return json(
        {
          ok: false,
          error: "route not found",
          path,
          method: request.method
        },
        404,
        cors
      );

    } catch (err) {
      console.error("WORKER ERROR:", err?.stack || err);

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
};