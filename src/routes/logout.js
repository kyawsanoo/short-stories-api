import { json } from "../utils/json";
import { requireUser } from "../utils/auth";

export async function logout(request, env, cors) {
  try {

    // 🔐 AUTH CHECK
    const auth = await requireUser(request, env, cors);

    if (auth.error) {
      return json(
        { ok: false, error: auth.error },
        auth.status,
        cors
      );
    }

    const user = auth.user;

    // 🚪 INVALIDATE SESSION TOKEN
    await env.DB.prepare(`
      UPDATE users
      SET session_token = NULL
      WHERE id = ?
    `)
      .bind(user.id)
      .run();

    return json(
      {
        ok: true,
        message: "Logged out successfully"
      },
      200,
      cors
    );

  } catch (err) {
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