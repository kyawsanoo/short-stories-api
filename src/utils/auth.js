export async function requireUser(request, env, cors) {
  try {
    if (!env?.DB) {
      console.error("DB NOT BOUND");
      return { error: "Database not connected", status: 500 };
    }

    const auth = request.headers.get("Authorization");

    if (!auth) {
      return { error: "Unauthorized", status: 401 };
    }

    const token = auth.replace("Bearer ", "").trim();

    if (!token || token === "null") {
      return { error: "Invalid token", status: 401 };
    }

    const user = await env.DB.prepare(
      "SELECT id, email, name FROM users WHERE session_token = ?"
    )
      .bind(token)
      .first();

    if (!user) {
      return { error: "Invalid session", status: 401 };
    }

    return { user };

  } catch (err) {
    console.error("AUTH CRASH:", err);
    return { error: "Auth failed", status: 500 };
  }
}