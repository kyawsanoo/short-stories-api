const ALLOWED_ORIGINS = [
  "https://fundorashop.com",
  "https://www.fundorashop.com"
];

// ================= CORS =================
function getCors(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
  }
  return { "Access-Control-Allow-Origin": "*" };
}

// ================= JSON =================
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });

// ================= HEX =================
function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

// ================= PBKDF2 VERIFY (YOUR DB FORMAT) =================
async function verifyPBKDF2(password, stored) {
  try {
    const [algo, iterations, saltHex, hash] = stored.split("$");

    if (algo !== "pbkdf2") return false;

    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derived = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: hexToBytes(saltHex),
        iterations: parseInt(iterations),
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );

    const result = [...new Uint8Array(derived)]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return result === hash;
  } catch {
    return false;
  }
}

// ================= CREATE PBKDF2 =================
async function createPBKDF2(password) {
  const iterations = 100000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  const hash = [...new Uint8Array(derived)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const saltHex = [...salt]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return `pbkdf2$${iterations}$${saltHex}$${hash}`;
}

// ================= TURNSTILE =================
async function verifyTurnstile(token, ip, env) {
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  form.append("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form }
  );

  return res.json();
}

// ================= INVOICE =================
function generateInvoiceNo() {
  return "INV-" + Date.now().toString(36).toUpperCase();
}

// ================= TELEGRAM =================
async function sendTelegram(env, message, orderId) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Approve", callback_data: `approve_${orderId}` },
            { text: "Reject", callback_data: `reject_${orderId}` }
          ]
        ]
      }
    })
  });
}

// ================= ORDER MESSAGE =================
function buildOrderMessage({ book, email, tx, id }) {
  return `📚 New Order\n\nBook: ${book?.title}\nPrice: ${book?.price}\nEmail: ${email}\nTX: ${tx}\nOrder: ${id}`;
}

// ================= SIGNUP =================
async function signup(request, env, cors) {
  const form = await request.formData();

  const email = (form.get("email") || "").toLowerCase().trim();
  const password = form.get("password");
  const name = (form.get("name") || "").trim();

  if (!email || !password || !name) {
    return json({ ok: false, error: "Missing fields" }, 400, cors);
  }

  const exists = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(email).first();

  if (exists) {
    return json({ ok: false, error: "User already exists" }, 409, cors);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await createPBKDF2(password);

  await env.DB.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    userId,
    email,
    passwordHash,
    name,
    new Date().toISOString()
  ).run();

  return json({ ok: true }, 200, cors);
}

// ================= LOGIN =================
async function login(request, env, cors) {
  const form = await request.formData();

  const email = (form.get("email") || "").toLowerCase().trim();
  const password = form.get("password");

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).bind(email).first();

  if (!user) {
    return json({ ok: false, error: "Invalid login" }, 401, cors);
  }

  const ok = await verifyPBKDF2(password, user.password_hash);

  if (!ok) {
    return json({ ok: false, error: "Invalid login" }, 401, cors);
  }

  return json({
    ok: true,
    token: crypto.randomUUID(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }, 200, cors);
}

// ================= BOOKS =================
async function books(request, env, cors) {
  const url = new URL(request.url);
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

  const BASE =
    "https://zyczqnpuwpxidaktpfzm.supabase.co/storage/v1/object/public/";

  const list = (result.results || []).map(b => ({
    ...b,
    cover: b.cover
      ? b.cover.startsWith("http")
        ? b.cover
        : BASE + "images/" + b.cover
      : "https://via.placeholder.com/300x200"
  }));

  return json({ ok: true, books: list }, 200, cors);
}

// ================= CATEGORIES =================
async function categories(env, cors) {
  const result = await env.DB.prepare(
    "SELECT * FROM categories ORDER BY sort_order ASC"
  ).all();

  return json({ ok: true, categories: result.results }, 200, cors);
}

// ================= SUBMIT ORDER =================
async function submit(request, env, cors) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const form = await request.formData();

  const email = form.get("email");
  const tx = form.get("tx");
  const bookId = form.get("book");
  const token = form.get("cf-turnstile-response");

  if (!email || !tx || !bookId) {
    return json({ ok: false, error: "Missing fields" }, 400, cors);
  }

  const verify = await verifyTurnstile(token, ip, env);

  if (!verify.success) {
    return json({ ok: false, error: "Bot blocked" }, 403, cors);
  }

  const exists = await env.DB.prepare(
    "SELECT id FROM orders WHERE tx = ?"
  ).bind(tx).first();

  if (exists) {
    return json({ ok: false, error: "TX already used" }, 409, cors);
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

  const book = await env.DB.prepare(
    "SELECT * FROM books WHERE id = ?"
  ).bind(bookId).first();

  const invoiceNo = generateInvoiceNo();

  await env.DB.prepare(`
    INSERT INTO invoices (id, order_id, invoice_no, email, book_id, amount, payment_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    orderId,
    invoiceNo,
    email,
    bookId,
    book?.price || 0,
    "pending",
    new Date().toISOString()
  ).run();

  await sendTelegram(env, buildOrderMessage({ book, email, tx, id: orderId }), orderId);

  return json({
    ok: true,
    order_id: orderId,
    invoice_no: invoiceNo
  }, 200, cors);
}

// ================= MAIN ROUTER =================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = getCors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/signup") return signup(request, env, cors);
    if (url.pathname === "/login") return login(request, env, cors);
    if (url.pathname === "/books") return books(request, env, cors);
    if (url.pathname === "/categories") return categories(env, cors);
    if (url.pathname === "/submit") return submit(request, env, cors);

    return json({ ok: false, error: "Route not found" }, 404, cors);
  }
};