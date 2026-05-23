// ================= CONFIG =================
const ALLOWED_ORIGINS = new Set([
  "https://fundorashop.com",
  "https://www.fundorashop.com",
  "https://staging.fundorashop.com"
]);

const JWT_SECRET = "CHANGE_THIS_TO_ENV_SECRET";

// ================= CORS =================
function getCors(request) {
  const origin = request.headers.get("Origin");

  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

// ================= RESPONSE =================
function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCors(request)
    }
  });
}

// ================= HASH PASSWORD (secure baseline) =================
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ================= JWT =================
function base64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJWT(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${body}`)
  );

  const signature = base64url(String.fromCharCode(...new Uint8Array(sig)));

  return `${header}.${body}.${signature}`;
}

async function verifyJWT(token) {
  if (!token) return null;

  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
    new TextEncoder().encode(`${header}.${body}`)
  );

  if (!valid) return null;

  return JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
}

// ================= AUTH MIDDLEWARE =================
async function requireAuth(request) {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;

  const token = auth.replace("Bearer ", "");
  return await verifyJWT(token);
}

// ================= MAIN =================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCors(request);

    // ================= BLOCK BAD ORIGINS =================
    const origin = request.headers.get("Origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response("Blocked", { status: 403 });
    }

    // ================= PRE-FLIGHT =================
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // ================= HEALTH =================
    if (url.pathname === "/") {
      return json({ ok: true, service: "fundorashop-api" }, 200, request);
    }

    // ================= BOOKS (PUBLIC) =================
    if (url.pathname === "/books") {
      const category = url.searchParams.get("category");

      let q = `
        SELECT id, title, price, author, description, cover, category
        FROM books
      `;

      const params = [];

      if (category && category !== "all") {
        q += " WHERE category = ?";
        params.push(category);
      }

      const res = await env.DB.prepare(q).bind(...params).all();

      return json({ ok: true, books: res.results || [] }, 200, request);
    }

    // ================= SIGNUP =================
    if (url.pathname === "/signup") {
      const form = await request.formData();

      const email = (form.get("email") || "").toLowerCase().trim();
      const password = form.get("password");
      const name = form.get("name");

      if (!email || !password) {
        return json({ ok: false, error: "Missing fields" }, 400, request);
      }

      const exists = await env.DB.prepare(
        "SELECT id FROM users WHERE email = ?"
      ).bind(email).first();

      if (exists) {
        return json({ ok: false, error: "User exists" }, 409, request);
      }

      const id = crypto.randomUUID();
      const hash = await hashPassword(password);

      await env.DB.prepare(`
        INSERT INTO users (id, email, password_hash, name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(id, email, hash, name, new Date().toISOString()).run();

      return json({ ok: true }, 200, request);
    }

    // ================= LOGIN (JWT) =================
    if (url.pathname === "/login") {
      const form = await request.formData();

      const email = (form.get("email") || "").toLowerCase().trim();
      const password = form.get("password");

      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE email = ?"
      ).bind(email).first();

      if (!user) {
        return json({ ok: false }, 401, request);
      }

      const hash = await hashPassword(password);

      if (hash !== user.password_hash) {
        return json({ ok: false }, 401, request);
      }

      const token = await signJWT({
        id: user.id,
        email: user.email,
        name: user.name,
        iat: Date.now()
      });

      return json({
        ok: true,
        token
      }, 200, request);
    }

    // ================= PROTECTED ORDER SUBMIT =================
    if (url.pathname === "/submit") {
      const user = await requireAuth(request);

      if (!user) {
        return json({ ok: false, error: "Unauthorized" }, 401, request);
      }

      const form = await request.formData();

      const tx = form.get("tx");
      const bookId = form.get("book");

      if (!tx || !bookId) {
        return json({ ok: false, error: "Missing fields" }, 400, request);
      }

      const orderId = crypto.randomUUID();

      await env.DB.prepare(`
        INSERT INTO orders (id, email, tx, book_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        orderId,
        user.email,
        tx,
        bookId,
        "pending",
        new Date().toISOString()
      ).run();

      return json({ ok: true, order_id: orderId }, 200, request);
    }

    // ================= NOT FOUND =================
    return json({ ok: false, error: "Not found" }, 404, request);
  }
};