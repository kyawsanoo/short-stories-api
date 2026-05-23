import { json } from "../utils/json";
import { hash } from "../utils/hash";

export async function signup(request, env, cors) {
  const form = await request.formData();

  const email = (form.get("email") || "").toLowerCase().trim();
  const password = form.get("password");
  const name = (form.get("name") || "").trim();

  if (!email || !password || !name) {
    return json(
      {
        ok: false,
        error: "Missing fields"
      },
      400,
      cors
    );
  }

  const exists = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (exists) {
    return json(
      {
        ok: false,
        error: "already exists"
      },
      409,
      cors
    );
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      email,
      await hash(password),
      name,
      new Date().toISOString()
    )
    .run();

  return json({ ok: true }, 200, cors);
}