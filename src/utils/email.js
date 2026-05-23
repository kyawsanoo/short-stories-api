export async function sendEbookEmail(data, env) {
  const { to, bookTitle, downloadLink } = data;

  console.log("EMAIL START:", { to, bookTitle, downloadLink });

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
      html: `
        <h2>${bookTitle}</h2>
        <p>Download your ebook below:</p>
        <a href="${downloadLink}">Download PDF</a>
      `
    })
  });

  const text = await res.text();

  console.log("RESEND STATUS:", res.status);
  console.log("RESEND RAW RESPONSE:", text);

  return { status: res.status, body: text };
}