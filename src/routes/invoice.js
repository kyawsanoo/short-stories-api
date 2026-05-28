import { json } from "../utils/json";
import { createSignedUrl } from "../utils/supabase";

export async function invoice(request, env, cors) {
  try {
    const url = new URL(request.url);

    const invoiceNo = url.pathname.split("/invoice/")[1];
    const email = url.searchParams.get("email");

    if (!invoiceNo || !email) {
      return json(
        { ok: false, error: "Missing invoice or email" },
        400,
        cors
      );
    }

    // Get invoice with product info AND streaming token
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
        i.invoice_url,
        i.product_type,
        i.product_id,
        b.title as book_title,
        b.file as book_file,
        b.price as book_price,
        vc.title as collection_title,
        vc.file as collection_file,
        vc.price as collection_price,
        vc.old_price as collection_old_price,
        va.access_token
      FROM invoices i
      LEFT JOIN books b ON i.product_id = b.id AND i.product_type = 'book'
      LEFT JOIN video_collections vc ON i.product_id = vc.id AND i.product_type = 'video_collection'
      LEFT JOIN video_access va ON i.order_id = va.order_id AND i.product_id = va.collection_id
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

    const isVideoCollection = invoice.product_type === "video_collection";
    const paymentStatus = invoice.payment_status || "pending";
    
    // STATUS DISPLAY MAPPING
    let statusText = "";
    let statusClass = "";

    if (paymentStatus === "paid") {
      statusText = "✓ PAID";
      statusClass = "status-paid";
    } else if (paymentStatus === "rejected") {
      statusText = "✗ REJECTED";
      statusClass = "status-rejected";
    } else {
      statusText = "⏳ PENDING";
      statusClass = "status-pending";
    }
    
    let productTitle = "";
    let productIcon = "";
    let downloadButtonText = "";
    let downloadUrl = null;
    let displayAmount = invoice.amount || 0;
    let streamingToken = invoice.access_token || null;
    
    if (isVideoCollection) {
      productTitle = invoice.collection_title || "Video Collection";
      productIcon = "🎬";
      downloadButtonText = "📥 Download Video Collection (ZIP)";
      
      if (paymentStatus === 'paid' && invoice.collection_file) {
        const fileValue = invoice.collection_file;
        if (fileValue.includes('drive.google.com') || fileValue.startsWith('http')) {
          downloadUrl = fileValue;
        } else {
          const filePath = `videos/${fileValue}`;
          downloadUrl = await createSignedUrl(filePath, "videos", env);
        }
      }
      if (displayAmount === 0 && invoice.collection_price) {
        displayAmount = invoice.collection_price;
      }
    } else {
      productTitle = invoice.book_title || "E-Book";
      productIcon = "📚";
      downloadButtonText = "📥 Download E-Book (PDF)";
      
      if (paymentStatus === 'paid' && invoice.book_file) {
        downloadUrl = await createSignedUrl(invoice.book_file, "ebooks", env);
      }
      if (displayAmount === 0 && invoice.book_price) {
        displayAmount = invoice.book_price;
      }
    }

    // Format price with old price if available
    let priceDisplay = `${displayAmount.toLocaleString()} MMK`;
    if (isVideoCollection && invoice.collection_old_price) {
      priceDisplay = `${displayAmount.toLocaleString()} MMK <span style="text-decoration: line-through; color: #999;">(Was: ${invoice.collection_old_price.toLocaleString()} MMK)</span>`;
    }

    const createdAt = new Date(invoice.created_at).toLocaleString();
    const orderId = invoice.order_id || "-";
    const displayEmail = invoice.email;

    // Generate watch URL if streaming token exists
    let watchUrl = "";
    if (isVideoCollection && paymentStatus === 'paid' && streamingToken) {
      watchUrl = `https://fundorashop.com/watch?token=${streamingToken}&id=${invoice.product_id}`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoice_no}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f0f0f;
      color: #e5e5e5;
      padding: 16px;
      line-height: 1.5;
    }
    .card {
      max-width: 650px;
      margin: 0 auto;
      background: #1c1c1c;
      padding: 24px 20px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    h1 { 
      color: #00d26a; 
      margin: 0 0 20px 0;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 28px;
      flex-wrap: wrap;
    }
    .product-icon { font-size: 36px; }
    .invoice-details { margin: 20px 0; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid #333;
      gap: 12px;
    }
    .detail-label {
      font-weight: 600;
      color: #9ca3af;
      min-width: 110px;
      flex-shrink: 0;
    }
    .detail-value {
      text-align: right;
      word-break: break-word;
      flex: 1;
    }
    .status {
      font-weight: bold;
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
    }
    .status-paid { background: #10b98120; color: #10b981; }
    .status-pending { background: #f59e0b20; color: #f59e0b; }
    .status-rejected { background: #ef444420; color: #ef4444; }
    .download {
      margin-top: 24px;
      display: block;
      padding: 14px 20px;
      text-align: center;
      background: ${isVideoCollection ? '#8b5cf6' : '#2563eb'};
      color: white;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
      font-size: 16px;
    }
    .download:hover { transform: translateY(-2px); filter: brightness(1.05); }
    .watch-btn {
      margin-top: 16px;
      display: block;
      padding: 14px 20px;
      text-align: center;
      background: #10b981;
      color: white;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
      font-size: 16px;
    }
    .watch-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
    .btn {
      margin-top: 20px;
      padding: 12px 20px;
      background: #374151;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      color: white;
      font-size: 14px;
      width: 100%;
    }
    .btn:hover { background: #4b5563; }
    .warning {
      background: #fef3c7;
      color: #92400e;
      padding: 14px 16px;
      border-radius: 12px;
      margin-top: 20px;
      font-size: 13px;
    }
    .warning.rejected {
      background: rgba(239, 68, 68, 0.1);
      border-left: 4px solid #ef4444;
      color: #ef4444;
    }
    .warning.rejected strong {
      color: #ef4444;
    }
    .warning strong { display: block; margin-bottom: 8px; }
    .warning ol, .warning ul { margin-left: 20px; margin-top: 8px; }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
    }
    .product-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
    }
    .badge-book { background: #2563eb20; color: #60a5fa; }
    .badge-video { background: #8b5cf620; color: #a78bfa; }
    @media (max-width: 550px) {
      body { padding: 12px; }
      .card { padding: 18px 16px; }
      h1 { font-size: 24px; }
      .product-icon { font-size: 28px; }
      .detail-row { flex-direction: column; padding: 10px 0; gap: 4px; }
      .detail-label { min-width: auto; font-size: 12px; }
      .detail-value { text-align: left; font-size: 14px; }
      .download, .watch-btn { padding: 12px 16px; font-size: 14px; }
    }
    @media print {
      body { background: white; color: black; }
      .card { background: white; box-shadow: none; }
      .download, .watch-btn, .btn { display: none; }
      .warning { background: #f0f0f0; border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
<div class="card">
  <h1><span class="product-icon">${productIcon}</span> INVOICE</h1>
  <div class="invoice-details">
    <div class="detail-row"><div class="detail-label">Invoice No:</div><div class="detail-value"><strong>${invoice.invoice_no}</strong></div></div>
    <div class="detail-row"><div class="detail-label">Order ID:</div><div class="detail-value">${orderId}</div></div>
    <div class="detail-row"><div class="detail-label">Email:</div><div class="detail-value email-value">${displayEmail}</div></div>
    <div class="detail-row"><div class="detail-label">Product:</div><div class="detail-value"><strong>${productTitle}</strong></div></div>
    <div class="detail-row"><div class="detail-label">Type:</div><div class="detail-value"><span class="product-badge ${isVideoCollection ? 'badge-video' : 'badge-book'}">${isVideoCollection ? '🎬 Video Collection' : '📚 E-Book'}</span></div></div>
    <div class="detail-row"><div class="detail-label">Amount:</div><div class="detail-value"><strong>${priceDisplay}</strong></div></div>
    <div class="detail-row"><div class="detail-label">Status:</div><div class="detail-value"><span class="status ${statusClass}">${statusText}</span></div></div>
    <div class="detail-row"><div class="detail-label">Date:</div><div class="detail-value">${createdAt}</div></div>
  </div>

  ${paymentStatus === 'paid' && downloadUrl ? `
    <a class="download" href="${downloadUrl}" target="_blank">${downloadButtonText}</a>
    ${watchUrl ? `<a class="watch-btn" href="${watchUrl}" target="_blank">🎬 Watch Now (Streaming)</a>` : ''}
    ${isVideoCollection ? `
      <div class="warning"><strong>📋 How to access your videos:</strong><ol><li>Download the ZIP file to your device (or watch instantly above)</li><li>Extract the ZIP file (right-click → Extract All)</li><li>Open the extracted folder to access your videos</li></ol><strong>⚠️ Note:</strong> The download link expires in 24 hours. Streaming link expires in 1 year.</div>
    ` : `
      <div class="warning"><strong>📋 Instructions:</strong><ul><li>Click the download button above</li><li>Save the PDF to your device</li><li>The link expires in 24 hours</li></ul></div>
    `}
  ` : paymentStatus === 'rejected' ? `
    <div class="warning rejected">
      <strong>❌ Order Rejected</strong>
      <p>Your order has been rejected. Possible reasons:</p>
      <ul>
        <li>Transaction ID could not be verified</li>
        <li>Payment amount does not match order total</li>
        <li>Duplicate transaction ID detected</li>
      </ul>
      <p>Please contact customer support for assistance.</p>
    </div>
  ` : `
    <div class="warning"><strong>⏳ Payment Pending</strong><p>Your ${isVideoCollection ? 'video collection' : 'ebook'} will be available for download after payment confirmation.</p><p>Please complete your payment and wait for admin approval. You will receive an email when your order is ready.</p></div>
  `}

  <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="footer"><p>© FundoraShop - Your Reliable Digital Marketplace</p><p>Need help? Contact: <a href="mailto:app.fundora@gmail.com" style="color: #60a5fa;">app.fundora@gmail.com</a></p></div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        ...cors
      }
    });

  } catch (err) {
    console.error("INVOICE ERROR:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors }
      }
    );
  }
}