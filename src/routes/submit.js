import { json } from "../utils/json";
import { sendOrderToTelegram } from "../utils/telegram";

export async function submit(request, env, cors) {
  const form = await request.formData();

  const email = form.get("email");
  const tx = form.get("tx");
  const bookId = form.get("book");

  if (!email || !tx || !bookId) {
    return json({ ok: false, error: "missing fields" }, 400, cors);
  }

  // check duplicate tx
  const exists = await env.DB.prepare(
    "SELECT id FROM orders WHERE tx = ?"
  ).bind(tx).first();

  if (exists) {
    return json({ ok: false, error: "tx already used" }, 409, cors);
  }

  const orderId = crypto.randomUUID();

  // 1. INSERT ORDER
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

  // 2. GET BOOK INFO
  const book = await env.DB.prepare(
    "SELECT title, price FROM books WHERE id = ?"
  ).bind(bookId).first();

  // 3. CREATE INVOICE NUMBER
  const invoiceNo =
    "INV-" + Math.random().toString(16).slice(2, 10).toUpperCase();

  // 4. INSERT INVOICE
  await env.DB.prepare(`
    INSERT INTO invoices 
    (id, order_id, invoice_no, email, book_id, amount, payment_status, created_at)
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

  // 5. TELEGRAM NOTIFY
  await sendOrderToTelegram(
    {
      id: orderId,
      email,
      tx,
      book_title: book?.title || "Unknown"
    },
    env
  );

  // 6. RESPONSE (IMPORTANT FOR FRONTEND REDIRECT)
  return json(
    {
      ok: true,
      order_id: orderId,
      invoice_no: invoiceNo
    },
    200,
    cors
  );
}