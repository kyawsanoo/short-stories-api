import { json } from "../utils/json";

export async function order(request, env, cors) {
  try {
    const url = new URL(request.url);

    // /order/38838381
    const tx = url.pathname.split("/order/")[1];

    if (!tx) {
      return json(
        { ok: false, error: "Order not found" },
        404,
        cors
      );
    }

    const order = await env.DB.prepare(
      `
      SELECT 
        o.id,
        o.email,
        o.tx,
        o.status,
        o.created_at,
        b.title,
        b.price
      FROM orders o
      LEFT JOIN books b ON o.book_id = b.id
      WHERE o.tx = ?
      `
    )
      .bind(tx)
      .first();

    if (!order) {
      return json(
        { ok: false, error: "Order not found" },
        404,
        cors
      );
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Order ${order.tx}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #0f0f0f;
      color: #fff;
      padding: 40px;
    }

    .card {
      max-width: 650px;
      margin: auto;
      background: #1c1c1c;
      padding: 30px;
      border-radius: 14px;
    }

    h1 {
      color: #00d26a;
      margin-top: 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      margin: 12px 0;
    }

    .label {
      opacity: 0.7;
    }

    .status {
      color: #00d26a;
      font-weight: bold;
    }

    .copy-box {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    input {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      border: none;
    }

    .btn {
      padding: 10px 14px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      background: #00d26a;
      font-weight: bold;
    }

    .btn:hover {
      opacity: 0.9;
    }
  </style>
</head>

<body>

<div class="card">

  <h1>ORDER DETAILS</h1>

  <div class="row">
    <span class="label">Order Number</span>
    <span>${order.tx}</span>
  </div>

  <div class="row">
    <span class="label">Email</span>
    <span>${order.email}</span>
  </div>

  <div class="row">
    <span class="label">Book</span>
    <span>${order.title}</span>
  </div>

  <div class="row">
    <span class="label">Price</span>
    <span>${order.price} MMK</span>
  </div>

  <div class="row">
    <span class="label">Status</span>
    <span class="status">${order.status}</span>
  </div>

  <div class="row">
    <span class="label">Date</span>
    <span>${order.created_at}</span>
  </div>

  <div class="copy-box">
    <input id="tx" value="${order.tx}" readonly />
    <button class="btn" onclick="copyTx()">Copy</button>
  </div>

</div>

<script>
function copyTx() {
  const input = document.getElementById("tx");
  input.select();
  document.execCommand("copy");
  alert("Order number copied!");
}
</script>

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
    console.error("ORDER ERROR:", err);

    return new Response("Server error", {
      status: 500,
      headers: cors
    });
  }
}