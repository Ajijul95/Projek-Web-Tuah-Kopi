// assets/js/order.js

let selectedPaymentMethod = "QR";

function setPaymentMethod(method) {
  selectedPaymentMethod = method;

  document.getElementById("pay-qr")?.classList.toggle("active", method === "QR");
  document.getElementById("pay-cash")?.classList.toggle("active", method === "Cash");

  const qrBox = document.getElementById("qr-box");
  if (qrBox) qrBox.style.display = method === "QR" ? "block" : "none";
}

function changeQty(productId, delta) {
  const cart = getCart();
  const item = cart.find((cartItem) => cartItem.id === productId);

  if (!item) return;

  item.qty += delta;

  const updatedCart = cart.filter((cartItem) => cartItem.qty > 0);
  saveCart(updatedCart);
  renderOrderCart();
}

function removeItem(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  renderOrderCart();
}

function renderOrderCart() {
  const cart = getCart();
  const cartList = document.getElementById("cart-list");
  const summaryLines = document.getElementById("summary-lines");
  const summaryTotal = document.getElementById("summary-total");

  if (!cartList || !summaryLines || !summaryTotal) return;

  if (!cart.length) {
    cartList.innerHTML = `
      <div class="empty-state">
        Keranjang masih kosong. Silakan tambah menu dulu dari halaman Menu.
      </div>
    `;
    summaryLines.innerHTML = "";
    summaryTotal.textContent = rupiah(0);
    return;
  }

  cartList.innerHTML = cart
    .map((item) => `
      <div class="cart-item">
        <div style="font-size: 28px; text-align: center;">${item.icon || "☕"}</div>
        <div>
          <strong>${item.name}</strong>
          <div style="color: var(--muted); font-size: 13px;">${rupiah(item.price)} x ${item.qty}</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
          <strong>${item.qty}</strong>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
          <button class="remove-btn" onclick="removeItem('${item.id}')">×</button>
        </div>
      </div>
    `)
    .join("");

  summaryLines.innerHTML = cart
    .map((item) => `
      <div class="summary-line">
        <span>${item.name} x${item.qty}</span>
        <span>${rupiah(item.price * item.qty)}</span>
      </div>
    `)
    .join("");

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  summaryTotal.textContent = rupiah(total);
}

async function submitOrder() {
  const customerName = document.getElementById("customer-name").value.trim();
  const tableNumber = Number(document.getElementById("table-number").value);
  const cart = getCart();

  if (!customerName) {
    alert("Nama pelanggan wajib diisi.");
    return;
  }

  if (!tableNumber) {
    alert("Nomor meja wajib diisi.");
    return;
  }

  if (!cart.length) {
    alert("Keranjang masih kosong.");
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const orderId = `TK-${Date.now()}`;

  const orderData = {
    orderCode: orderId,
    customerName,
    tableNumber,
    items: cart,
    total,
    paymentMethod: selectedPaymentMethod,
    status: "baru",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection("orders").doc(orderId.toLowerCase()).set(orderData);
    localStorage.setItem("tuah_last_order_code", orderId);
    localStorage.removeItem("tuah_cart");
    updateCartCount();
    renderOrderCart();
    alert(`Pesanan berhasil dikirim. Kode pesanan: ${orderId}. Kamu akan diarahkan ke halaman aktivitas pesanan.`);
    window.location.href = `tracking.html?code=${encodeURIComponent(orderId)}`;
  } catch (error) {
    console.error("Gagal menyimpan pesanan:", error);
    alert("Gagal menyimpan pesanan ke Firebase. Cek rules Firestore dan koneksi internet.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  setPaymentMethod("QR");
  renderOrderCart();
});
