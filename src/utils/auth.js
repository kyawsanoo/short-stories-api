export async function requireUser(request, env, cors) {
  const auth = request.headers.get("Authorization");

  if (!auth) {
    return { error: "Unauthorized", status: 401 };
  }

  const token = auth.replace("Bearer ", "").trim();

  const user = await env.DB.prepare(
    "SELECT id, email, name FROM users WHERE session_token = ?"
  )
    .bind(token)
    .first();

  if (!user) {
    return { error: "Invalid session", status: 401 };
  }

  return { user };
}