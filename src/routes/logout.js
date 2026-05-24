import { json } from "../utils/json";
import { requireUser } from "../utils/auth";

export async function logout(request, env, cors) {
  try {
    // 1. Basic DB check
    if (!env?.DB) {
      return json(
        { ok: false, error: "Database not available" },
        500,
        cors
      );
    }

    // 2. Get auth result safely
    let auth;

    try {
      auth = await requireUser(request, env, cors);
    } catch (err) {
      console.error("requireUser crashed:", err);
      return json(
        { ok: false, error: "Unauthorized" },
        401,
        cors
      );
    }

    // 3. If requireUser returned error
    if (!auth || auth.error) {
      return json(
        {
          ok: false,
          error: auth?.error || "Unauthorized"
        },
        auth?.status || 401,
        cors
      );
    }

    const user = auth.user;

    // 4. Validate user
    if (!user?.id) {
      return json(
        { ok: false, error: "Invalid session" },
        401,
        cors
      );
    }

    // 5. Invalidate session in DB
    try {
      await env.DB.prepare(
        "UPDATE users SET session_token = NULL, session_expires = NULL WHERE id = ?"
      )
        .bind(user.id)
        .run();
    } catch (dbErr) {
      console.error("DB logout error:", dbErr);
      return json(
        { ok: false, error: "Failed to logout" },
        500,
        cors
      );
    }

    // 6. Success response
    return json(
      {
        ok: true,
        message: "Logged out successfully"
      },
      200,
      cors
    );

  } catch (err) {
    console.error("LOGOUT FATAL ERROR:", err?.stack || err);

    return json(
  {
    ok: false,
    error: "Logout failed",
    details: err?.stack || String(err)
  },
  500,
  cors
);
  }
}