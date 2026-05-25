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

    // 5. Invalidate session in DB (only update columns that exist)
    // Remove 'session_expires' if your table doesn't have it
    await env.DB.prepare(
      "UPDATE users SET session_token = NULL WHERE id = ?"
    )
      .bind(user.id)
      .run();

    console.log("✅ User logged out:", user.email);

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
        error: "Logout failed"
      },
      500,
      cors
    );
  }
}