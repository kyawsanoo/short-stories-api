// =========================
// BOOK EMAIL (PDF)
// =========================
export async function sendBookEmail(data, env) {
  const { to, bookTitle, downloadLink } = data;

  console.log("📚 BOOK EMAIL START:", { to, bookTitle, downloadLink });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; text-align: center; border-radius: 10px; }
        .content { padding: 30px; background: #f9fafb; border-radius: 10px; margin-top: 20px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 Thank You for Your Purchase!</h1>
        </div>
        <div class="content">
          <h2>Your Ebook: ${bookTitle}</h2>
          <p>Your ebook is ready for download. Click the button below to download your PDF.</p>
          
          <div style="text-align: center;">
            <a href="${downloadLink}" class="button">📥 Download Ebook (PDF)</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Notes:</strong>
            <ul>
              <li>The download link expires in <strong>24 hours</strong></li>
              <li>Save the PDF to your device for offline reading</li>
              <li>If the link expires, please contact support</li>
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
      from: "Fundora <onboarding@resend.dev>",
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
// VIDEO COLLECTION EMAIL (ZIP)
// =========================
export async function sendVideoEmail(data, env) {
  const { to, collectionTitle, downloadLink } = data;

  console.log("🎬 VIDEO EMAIL START:", { to, collectionTitle, downloadLink });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 30px; text-align: center; border-radius: 10px; }
        .content { padding: 30px; background: #f9fafb; border-radius: 10px; margin-top: 20px; }
        .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
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
          <h2>Your Video Collection: ${collectionTitle}</h2>
          <p>Your video collection is ready for download. Click the button below to download the ZIP file.</p>
          
          <div style="text-align: center;">
            <a href="${downloadLink}" class="button">📥 Download Video Collection (ZIP)</a>
          </div>
          
          <div class="steps">
            <strong>📋 How to access your videos:</strong>
            <ol>
              <li>Download the ZIP file to your computer or phone</li>
              <li>Extract the ZIP file (right-click → Extract All)</li>
              <li>Open the extracted folder to access your videos</li>
              <li>Videos can be played on any media player</li>
            </ol>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Notes:</strong>
            <ul>
              <li>The download link expires in <strong>24 hours</strong></li>
              <li>Download on a stable internet connection</li>
              <li>Keep the ZIP file in a safe place after extraction</li>
              <li>If the link expires, please contact support</li>
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
      from: "Fundora <onboarding@resend.dev>",
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
// UNIFIED FUNCTION (Backward Compatibility)
// =========================
export async function sendEbookEmail(data, env) {
  const { to, bookTitle, downloadLink, isVideoCollection, fileType } = data;

  if (isVideoCollection) {
    return sendVideoEmail({
      to: to,
      collectionTitle: bookTitle,
      downloadLink: downloadLink
    }, env);
  } else {
    return sendBookEmail({
      to: to,
      bookTitle: bookTitle,
      downloadLink: downloadLink
    }, env);
  }
}

// =========================
// PASSWORD RESET EMAIL
// =========================
export async function sendResetEmail(data, env) {
  const { to, name, resetUrl } = data;

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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Fundora <onboarding@resend.dev>",
      to: [to],
      subject: "Reset Your Password",
      html: html
    })
  });

  return await res.json();
}