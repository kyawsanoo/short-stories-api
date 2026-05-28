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

import { forgetPassword } from "./routes/forgetPassword";
import { resetPassword } from "./routes/resetPassword";
import { submitRating } from "./routes/submitRating";
import { getReviews } from "./routes/getReviews";
import { verifyStreamingAccess } from "./routes/verifyStreamingAccess";  
import { generateShareToken } from "./routes/generateShareToken";
import { verifyShareToken } from "./routes/verifyShareToken";



// Last deploy: 2026-05-27 - Testing GitHub Actions

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
      
if (path === "/forget-password" && request.method === "POST") {
  return forgetPassword(request, env, cors);
}

if (path === "/reset-password" && request.method === "POST") {
  return resetPassword(request, env, cors);
}

if (path === "/submit-rating" && request.method === "POST") {
  return submitRating(request, env, cors);
}

if (path === "/book-reviews" && request.method === "GET") {
  return getReviews(request, env, cors);
}

// =============================================
// SITEMAP ROUTE - ADD THIS HERE
// =============================================
if (path === "/sitemap.xml") {
  const books = await env.DB.prepare("SELECT id, title FROM books").all();
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://fundorashop.com/</loc>
    <priority>1.0</priority>
  </url>`;
  
  for (const book of books.results) {
    sitemap += `
  <url>
    <loc>https://fundorashop.com/#/book/${book.id}</loc>
    <priority>0.8</priority>
  </url>`;
  }
  
  sitemap += `
</urlset>`;
  
  return new Response(sitemap, {
    headers: { "Content-Type": "application/xml" }
  });
}


// Add routes
if (path === "/generate-share-token" && request.method === "POST") {
  return generateShareToken(request, env, cors);
}

if (path === "/verify-share-token" && request.method === "GET") {
  return verifyShareToken(request, env, cors);
}

if (path === "/verify-streaming-access" && request.method === "GET") {
  return verifyStreamingAccess(request, env, cors);
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