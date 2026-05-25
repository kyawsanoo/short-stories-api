import { json } from "../utils/json";
import { verify } from "../utils/hash";

export async function login(request, env, cors) {
  const form = await request.formData();

  const email = (form.get("email") || "").toLowerCase().trim();
  const password = form.get("password");

  if (!email || !password) {
    return json(
      {
        ok: false,
        error: "Missing email or password"
      },
      400,
      cors
    );
  }

  const user = await env.DB.prepare(
    "SELECT id, email, name, password_hash FROM users WHERE email = ?"  // ← Make sure 'name' is selected
  )
    .bind(email)
    .first();

  if (!user) {
    return json(
      {
        ok: false,
        error: "Invalid login"
      },
      401,
      cors
    );
  }

  const isValid = await verify(password, user.password_hash);

  if (!isValid) {
    return json(
      {
        ok: false,
        error: "Invalid login"
      },
      401,
      cors
    );
  }

  const token = crypto.randomUUID();

  // Update session token
  await env.DB.prepare(
    "UPDATE users SET session_token = ? WHERE id = ?"
  )
    .bind(token, user.id)
    .run();

  return json(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name  // ← CRITICAL: Return the name
      },
      token: token
    },
    200,
    cors
  );
}