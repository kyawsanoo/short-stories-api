import { json } from "../utils/json";
import { sendResetEmail } from "../utils/email";

export async function forgetPassword(request, env, cors) {
  try {
    const form = await request.formData();
    const email = (form.get("email") || "").toLowerCase().trim();

    if (!email) {
      return json(
        { ok: false, error: "Email is required" },
        400,
        cors
      );
    }

    // Check if user exists
    const user = await env.DB.prepare(
      "SELECT id, email, name FROM users WHERE email = ?"
    ).bind(email).first();

    if (!user) {
      // For security, don't reveal if email exists or not
      return json(
        { ok: true, message: "If your email is registered, you will receive a reset link." },
        200,
        cors
      );
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token valid for 1 hour

    // Store reset token in database
    await env.DB.prepare(`
      UPDATE users 
      SET reset_token = ?, 
          reset_expires = ? 
      WHERE id = ?
    `).bind(resetToken, resetExpires.toISOString(), user.id).run();

    // =============================================
    // GENERATE RESET URL - FIXED (use your worker URL)
    // =============================================
    //const resetUrl = `https://fundorashop.kyawsanoo-androider.workers.dev?token=${resetToken}&email=${email}`;
    const resetUrl = `https://fundorashop.com?token=${resetToken}&email=${email}`;

    // Send email with reset link
    try {
      await sendResetEmail({
        to: email,
        name: user.name,
        resetUrl: resetUrl
      }, env);
      console.log("✅ Reset email sent to:", email);
    } catch (emailErr) {
      console.error("❌ Failed to send reset email:", emailErr);
      // Don't expose email error to user
    }

    return json(
      { ok: true, message: "If your email is registered, you will receive a reset link." },
      200,
      cors
    );

  } catch (err) {
    console.error("FORGET PASSWORD ERROR:", err);
    return json(
      { ok: false, error: "Server error. Please try again." },
      500,
      cors
    );
  }
}