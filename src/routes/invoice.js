import { json } from "../utils/json";

export async function invoice(request, env, cors) {
  try {
    const url = new URL(request.url);

    const invoiceNo = url.pathname.split("/invoice/")[1];
    const email = url.searchParams.get("email");

    // =========================
    // VALIDATION
    // =========================
    if (!invoiceNo || !email) {
      return json(
        { ok: false, error: "Missing invoice or email" },
        400,
        cors
      );
    }

    // =========================
    // DB QUERY
    // =========================
    const invoice = await env.DB.prepare(
      `
      SELECT 
        i.id,
        i.invoice_no,
        i.order_id,
        i.email,
        i.amount,
        i.payment_status,
        i.created_at,
        i.download_url,
        b.title
      FROM invoices i
      LEFT JOIN books b ON i.book_id = b.id
      WHERE i.invoice_no = ? AND i.email = ?
      `
    )
      .bind(invoiceNo, email)
      .first();

    if (!invoice) {
      return json(
        { ok: false, error: "Invoice not found" },
        404,
        cors
      );
    }

    // =========================
    // SAFE VALUES
    // =========================
    const paymentStatus = invoice.payment_status || "pending";
    const title = invoice.title || "Unknown Book";
    const createdAt = new Date(invoice.created_at).toLocaleString();
    const orderId = invoice.order_id || "-";

    const isPaid = paymentStatus === "paid";
    const ebookUrl = isPaid ? invoice.download_url : null;

    // =========================
    // HTML
    // =========================
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoice_no}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: Arial;
      background: #0f0f0f;
      color: white;
      padding: 40px;
    }
    .card {
      max-width: 650px;
      margin: auto;
      background: #1c1c1c;
      padding: 30px;
      border-radius: 14px;
    }
    h1 { color: #00d26a; }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
    }
    .status {
      color: #00d26a;
      font-weight: bold;
    }
    .btn {
      margin-top: 20px;
      padding: 10px;
      background: #00d26a;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
    }
    .download {
      margin-top: 20px;
      display: block;
      padding: 12px;
      text-align: center;
      background: #2563eb;
      color: white;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
    }
  </style>
</head>
<body>

<div class="card">
  <h1>INVOICE</h1>

  <div class="row"><span>Invoice</span><span>${invoice.invoice_no}</span></div>
  <div class="row"><span>Order ID</span><span>${orderId}</span></div>
  <div class="row"><span>Email</span><span>${invoice.email}</span></div>
  <div class="row"><span>Book</span><span>${title}</span></div>
  <div class="row"><span>Amount</span><span>${invoice.amount} MMK</span></div>
  <div class="row"><span>Payment Status</span><span class="status">${paymentStatus}</span></div>
  <div class="row"><span>Date</span><span>${createdAt}</span></div>

  ${isPaid && ebookUrl ? `
    <a class="download" href="${ebookUrl}" target="_blank">
      📥 Download E-Book
    </a>
  ` : `
    <p style="margin-top:15px;color:gray;">
      Ebook will be available after payment confirmation.
    </p>
  `}

  <button class="btn" onclick="window.print()">Print / Save PDF</button>
</div>

</body>
</html>
`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        ...cors
      }
    });

  } catch (err) {
    console.error("INVOICE ERROR:", err);

    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      }
    );
  }
}