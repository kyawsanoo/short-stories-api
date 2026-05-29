// =========================
// BOOK EMAIL (PDF + ONLINE READER)
// =========================
export async function sendBookEmail(data, env) {
  const { to, bookTitle, downloadLink, readerUrl } = data;

  console.log("📚 BOOK EMAIL START:", { to, bookTitle, downloadLink, readerUrl });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; text-align: center; border-radius: 10px; }
        .content { padding: 30px; background: #f9fafb; border-radius: 10px; margin-top: 20px; }
        .button { display: inline-block; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .read-btn { background: #10b981; }
        .download-btn { background: #3b82f6; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .success-box { background: #10b98120; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 Thank You for Your Purchase!</h1>
        </div>
        <div class="content">
          <h2>${bookTitle}</h2>
          
          <!-- Online Reader Option -->
          ${readerUrl ? `
          <div class="success-box">
            <h3 style="color: #10b981; margin-top: 0;">📖 Read Online (Recommended)</h3>
            <p>Click below to read instantly in your browser. No download needed!</p>
            <a href="${readerUrl}" class="button read-btn" style="background: #10b981;">📖 Read Online Now</a>
            <p style="font-size: 12px; margin-top: 10px;">✨ Works on any device • Instant reading • No storage needed</p>
          </div>
          ` : ''}
          
          <!-- Download Option -->
          <div style="text-align: center; margin: 20px 0;">
            <p>Or download the PDF for offline reading:</p>
            <a href="${downloadLink}" class="button download-btn" style="background: #3b82f6;">📥 Download PDF</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Notes:</strong>
            <ul>
              <li>🔗 Online reader link expires in <strong>1 year</strong></li>
              <li>📥 Download link expires in <strong>24 hours</strong></li>
              <li>💾 Save the PDF to your device for permanent offline access</li>
              <li>📖 Bookmark the reader link for easy access</li>
              <li>❓ If anything doesn't work, contact support</li>
            </ul>
          </div>
          
          <p><strong>Need help?</strong> Contact us at <a href="mailto:app.fundora@gmail.com">app.fundora@gmail.com</a></p>
        </div>
        <div class="footer">
          <p>© FundoraShop - Your Reliable Digital Marketplace</p>
          <p>This email was sent to ${to}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Fundora <noreply@fundorashop.com>",
      to: [to],
      subject: `Your Ebook: ${bookTitle}`,
      html: html
    })
  });

  const text = await res.text();
  console.log("📚 BOOK EMAIL RESULT:", res.status);
  return { status: res.status, body: text };
}


// =========================
// VIDEO COLLECTION EMAIL (ZIP + STREAMING)
// =========================
// utils/email.js
export async function sendVideoEmail(data, env) {
  const { to, collectionTitle, downloadLink, watchUrl } = data;

  console.log("🎬 VIDEO EMAIL START:", { to, collectionTitle, downloadLink, watchUrl });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 30px; text-align: center; border-radius: 10px; }
        .content { padding: 30px; background: #f9fafb; border-radius: 10px; margin-top: 20px; }
        .button { display: inline-block; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .watch-btn { background: #10b981; }
        .download-btn { background: #3b82f6; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .steps { background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 Thank You for Your Purchase!</h1>
        </div>
        <div class="content">
          <h2>${collectionTitle}</h2>
          
          <!-- Watch Now Button (Streaming) -->
          <div style="text-align: center; background: #10b98120; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #10b981; margin-top: 0;">📺 Watch Instantly</h3>
            <p>Click below to watch immediately in your browser. No download needed!</p>
            <a href="${watchUrl}" class="button watch-btn" style="background: #10b981;">🎬 Watch Now</a>
            <p style="font-size: 12px; margin-top: 10px;">✨ Works on any device • Instant playback • Streaming link valid for 1 year</p>
          </div>
          
          <!-- Download Option -->
          <div style="text-align: center; background: #e0e7ff; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">📥 Download for Offline</h3>
            <p>Download the ZIP file to watch offline:</p>
            <a href="${downloadLink}" class="button download-btn" style="background: #3b82f6;">📥 Download ZIP</a>
            <ol style="text-align: left; margin-top: 15px;">
              <li>Download the ZIP file to your computer or phone</li>
              <li>Extract the ZIP file (right-click → Extract All)</li>
              <li>Open the extracted folder to access your videos</li>
            </ol>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Notes:</strong>
            <ul>
              <li>🔗 Streaming link: <strong>${watchUrl}</strong></li>
              <li>📥 Download link expires in <strong>24 hours</strong></li>
              <li>📺 Streaming link expires in <strong>1 year</strong></li>
              <li>💾 Save the ZIP file for permanent offline access</li>
              <li>❓ Need help? Contact support</li>
            </ul>
          </div>
          
          <p><strong>Need help?</strong> Contact us at <a href="mailto:app.fundora@gmail.com">app.fundora@gmail.com</a></p>
        </div>
        <div class="footer">
          <p>© FundoraShop - Your Reliable Digital Marketplace</p>
          <p>This email was sent to ${to}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Fundora <noreply@fundorashop.com>",
      to: [to],
      subject: `Your Video Collection: ${collectionTitle}`,
      html: html
    })
  });

  const text = await res.text();
  console.log("🎬 VIDEO EMAIL RESULT:", res.status);
  return { status: res.status, body: text };
}


// =========================
// PASSWORD RESET EMAIL
// =========================
// utils/email.js - Updated sendResetEmail
export async function sendResetEmail(data, env) {
  const { to, name, resetUrl } = data;

  console.log("📧 PASSWORD RESET EMAIL START:", { to, name, resetUrl });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔐 Password Reset</h2>
        </div>
        <div class="content">
          <p>Hello ${name || "User"},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p>Or copy this link: <br>${resetUrl}</p>
          
          <p><strong>⚠️ This link expires in 1 hour.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© FundoraShop - Your Reliable Digital Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Try Resend
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Fundora <noreply@fundorashop.com>",
        to: [to],
        subject: "Reset Your Password",
        html: html
      })
    });

    const result = await res.json();
    console.log("📧 Resend Response Status:", res.status);
    
    if (res.ok) {
      console.log("✅ Email sent successfully via Resend");
      return { ok: true, sent: true };
    } else {
      console.error("❌ Resend failed:", result);
    }
  } catch (err) {
    console.error("❌ Resend error:", err.message);
  }

  // =============================================
  // FALLBACK: Log to console (you'll see in wrangler tail)
  // =============================================
  console.log("\n" + "═".repeat(60));
  console.log("🔐 PASSWORD RESET LINK (EMAIL FAILED - USE THIS LINK)");
  console.log("═".repeat(60));
  console.log(`📧 Email: ${to}`);
  console.log(`🔗 Reset Link: ${resetUrl}`);
  console.log("═".repeat(60) + "\n");
  
  // Return success with link (for development)
  return { 
    ok: true, 
    sent: false,
    dev_link: resetUrl,  // ← Frontend can show this in development
    message: "Reset link generated. Check server logs or contact support."
  };
}