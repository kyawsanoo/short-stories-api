import { json } from "../utils/json";
import { verify } from "../utils/hash";

export async function login(request, env, cors) {
  const form = await request.formData();

  const email = (form.get("email") || "").toLowerCase().trim();
  const password = form.get("password");

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!user) {
    return json({ ok: false, error: "invalid login" }, 401, cors);
  }

  const ok = await verify(password, user.password_hash);

  if (!ok) {
    return json({ ok: false, error: "invalid login" }, 401, cors);
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