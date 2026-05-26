import { json } from "../utils/json";
import { hash } from "../utils/hash";

export async function resetPassword(request, env, cors) {
  try {
    const form = await request.formData();
    const token = form.get("token");
    const email = (form.get("email") || "").toLowerCase().trim();
    // FIXED: Accept both field names
    const newPassword = form.get("new_password") || form.get("password");
    const confirmPassword = form.get("confirm_password");

    // Validation
    if (!token || !email || !newPassword || !confirmPassword) {
      return json(
        { ok: false, error: "All fields are required" },
        400,
        cors
      );
    }

    if (newPassword.length < 8) {
      return json(
        { ok: false, error: "Password must be at least 8 characters" },
        400,
        cors
      );
    }

    if (newPassword !== confirmPassword) {
      return json(
        { ok: false, error: "Passwords do not match" },
        400,
        cors
      );
    }

    // Find user with valid reset token
    const user = await env.DB.prepare(`
      SELECT id, email, reset_token, reset_expires 
      FROM users 
      WHERE email = ? AND reset_token = ?
    `).bind(email, token).first();

    if (!user) {
      return json(
        { ok: false, error: "Invalid or expired reset link" },
        400,
        cors
      );
    }

    // Check if token expired
    const now = new Date();
    const expires = new Date(user.reset_expires);

    if (now > expires) {
      return json(
        { ok: false, error: "Reset link has expired. Please request a new one." },
        400,
        cors
      );
    }

    // Hash new password and update
    const passwordHash = await hash(newPassword);

    await env.DB.prepare(`
      UPDATE users 
      SET password_hash = ?,
          reset_token = NULL,
          reset_expires = NULL
      WHERE id = ?
    `).bind(passwordHash, user.id).run();

    console.log("✅ Password reset for:", email);

    return json(
      { ok: true, message: "Password reset successful. You can now login with your new password." },
      200,
      cors
    );

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return json(
      { ok: false, error: "Server error. Please try again." },
      500,
      cors
    );
  }
}