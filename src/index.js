// ================= ALLOWED ORIGINS =================
const ALLOWED_ORIGINS = new Set([
  "https://fundorashop.com",
  "https://www.fundorashop.com",
  "https://staging.fundorashop.com"
]);

function getCors(request) {
  const origin = request.headers.get("Origin");

  const allowed = new Set([
    "https://fundorashop.com",
    "https://www.fundorashop.com",
    "https://staging.fundorashop.com"
  ]);

  const safeOrigin =
    origin && allowed.has(origin)
      ? origin
      : "https://fundorashop.com";

  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}
// ================= JSON HELPER =================
function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCors(request)
    }
  });
}

// ================= ROUTES =================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = getCors(request);

    // ================= PRE-FLIGHT =================
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    // ================= HEALTH CHECK =================
    if (url.pathname === "/") {
      return json(
        { ok: true, service: "fundorashop-api", status: "running" },
        200,
        request
      );
    }

    // ================= CATEGORIES =================
    if (url.pathname === "/categories") {
      const result = await env.DB.prepare(
        "SELECT * FROM categories ORDER BY sort_order ASC"
      ).all();

      return json(
        { ok: true, categories: result.results || [] },
        200,
        request
      );
    }

    // ================= BOOKS =================
    if (url.pathname === "/books") {
      const category = url.searchParams.get("category");

      let query = `
        SELECT id, title, price, author, description, cover, category, video
        FROM books
      `;

      const params = [];

      if (category && category !== "all") {
        query += " WHERE category = ?";
        params.push(category);
      }

      const result = await env.DB.prepare(query).bind(...params).all();

      return json(
        { ok: true, books: result.results || [] },
        200,
        request
      );
    }

    // ================= LOGIN =================
    if (url.pathname === "/login") {
      const form = await request.formData();

      const email = (form.get("email") || "").toLowerCase().trim();
      const password = form.get("password");

      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE email = ?"
      ).bind(email).first();

      if (!user) {
        return json({ ok: false, error: "Invalid login" }, 401, request);
      }

      return json({
        ok: true,
        token: crypto.randomUUID(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }, 200, request);
    }

    // ================= SIGNUP =================
    if (url.pathname === "/signup") {
      const form = await request.formData();

      const email = (form.get("email") || "").toLowerCase().trim();
      const password = form.get("password");
      const name = (form.get("name") || "").trim();

      const exists = await env.DB.prepare(
        "SELECT id FROM users WHERE email = ?"
      ).bind(email).first();

      if (exists) {
        return json({ ok: false, error: "User already exists" }, 409, request);
      }

      const id = crypto.randomUUID();

      await env.DB.prepare(`
        INSERT INTO users (id, email, password_hash, name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        id,
        email,
        password,
        name,
        new Date().toISOString()
      ).run();

      return json({ ok: true }, 200, request);
    }

    // ================= SUBMIT ORDER =================
    if (url.pathname === "/submit") {
      const form = await request.formData();

      const email = form.get("email");
      const tx = form.get("tx");
      const bookId = form.get("book");

      if (!email || !tx || !bookId) {
        return json({ ok: false, error: "Missing fields" }, 400, request);
      }

      const orderId = crypto.randomUUID();

      await env.DB.prepare(`
        INSERT INTO orders (id, email, tx, book_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        orderId,
        email,
        tx,
        bookId,
        "pending",
        new Date().toISOString()
      ).run();

      return json({
        ok: true,
        order_id: orderId
      }, 200, request);
    }

    // ================= NOT FOUND =================
    return json(
      { ok: false, error: "Route not found" },
      404,
      request
    );
  }
};