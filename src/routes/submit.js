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

  // check duplicate transaction
  const exists = await env.DB.prepare(
    "SELECT id FROM orders WHERE tx = ?"
  ).bind(tx).first();

  if (exists) {
    return json({ ok: false, error: "tx already used" }, 409, cors);
  }

  const orderId = crypto.randomUUID();

  // insert order
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

  // get book title
  const book = await env.DB.prepare(
    "SELECT title FROM books WHERE id = ?"
  ).bind(bookId).first();

  // send to Telegram bot
  await sendOrderToTelegram(
    {
      id: orderId,
      email,
      tx,
      book_title: book?.title || "Unknown"
    },
    env
  );

  return json(
    {
      ok: true,
      order_id: orderId
    },
    200,
    cors
  );
}