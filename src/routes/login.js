import { json } from "../utils/json";
import { verify } from "../utils/hash";

export async function login(request, env, cors) {
  try {
    const form = await request.formData();

    const email = (form.get("email") || "").toLowerCase().trim();
    const password = form.get("password");

    if (!email || !password) {
      return json({ ok: false, error: "missing fields" }, 400, cors);
    }

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

    // 🔥 CREATE SESSION TOKEN
    const token = crypto.randomUUID();

    // 🔥 STORE IN DB
    await env.DB.prepare(
      "UPDATE users SET session_token = ? WHERE id = ?"
    )
      .bind(token, user.id)
      .run();

    return json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    }, 200, cors);

  } catch (err) {
    return json({
      ok: false,
      error: "login failed"
    }, 500, cors);
  }
}