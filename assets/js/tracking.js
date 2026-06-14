// assets/js/tracking.js
// Halaman aktivitas/tracking pesanan user.

let trackingUnsubscribe = null;

const trackingSteps = [
  {
    key: "baru",
    icon: "🧾",
    title: "Pesanan Diterima",
    desc: "Pesanan sudah masuk ke sistem.",
  },
  {
    key: "proses",
    icon: "☕",
    title: "Sedang Diproses",
    desc: "Barista sedang menyiapkan minuman.",
  },
  {
    key: "diantar",
    icon: "🚶",
    title: "Diantar",
    desc: "Pesanan sedang diantar ke meja.",
  },
  {
    key: "selesai",
    icon: "✅",
    title: "Selesai",
    desc: "Pesanan sudah selesai.",
  },
];

function getOrderDocId(code) {
  return String(code || "").trim().toLowerCase();
}

function getStatusIndex(status) {
  const index = trackingSteps.findIndex((step) => step.key === status);
  return index < 0 ? 0 : index;
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "-";
  }
}

function renderTrackingEmpty(message = "Masukkan kode pesanan untuk melihat aktivitas pesanan.") {
  const result = document.getElementById("tracking-result");
  if (!result) return;

  result.innerHTML = `
    <div class="tracking-card">
      <div class="card-body empty-state">${message}</div>
    </div>
  `;
}

function renderTrackingOrder(order) {
  const result = document.getElementById("tracking-result");
  if (!result) return;

  const status = order.status || "baru";
  const statusIndex = getStatusIndex(status);
  const isCanceled = status === "batal";

  const stepsHtml = trackingSteps
    .map((step, index) => {
      let stepClass = "progress-step";

      if (!isCanceled && index < statusIndex) stepClass += " done";
      if (!isCanceled && index === statusIndex) stepClass += " active";

      return `
        <div class="${stepClass}">
          <div class="step-icon">${step.icon}</div>
          <strong>${step.title}</strong>
          <small>${step.desc}</small>
        </div>
      `;
    })
    .join("");

  const itemsHtml = (order.items || [])
    .map((item) => `
      <div class="summary-line">
        <span>${item.icon || "☕"} ${item.name || "Menu"} x${item.qty || 1}</span>
        <span>${rupiah((Number(item.price) || 0) * (Number(item.qty) || 1))}</span>
      </div>
    `)
    .join("");

  result.innerHTML = `
    <div class="tracking-card">
      <div class="card-header">
        <div>
          <h3>Aktivitas Pesanan <span class="tracking-code">${order.orderCode || order.id}</span></h3>
          <p style="color: var(--muted); font-size: 13px; margin-top: 4px;">
            Status akan berubah otomatis saat admin/barista memperbarui pesanan.
          </p>
        </div>
        <span class="status-pill ${statusClass(status)}">${statusLabel(status)}</span>
      </div>
      <div class="card-body">
        ${isCanceled ? `
          <div class="empty-state" style="background:#fff0f0;border-radius:12px;color:var(--danger);">
            Pesanan ini dibatalkan. Silakan hubungi staff Tuah Kopi jika ada kesalahan.
          </div>
        ` : `
          <div class="progress-steps">${stepsHtml}</div>
        `}

        <div class="tracking-detail-grid">
          <div class="tracking-detail-item"><span>Pelanggan</span><strong>${order.customerName || "-"}</strong></div>
          <div class="tracking-detail-item"><span>Nomor Meja</span><strong>${order.tableNumber || "-"}</strong></div>
          <div class="tracking-detail-item"><span>Pembayaran</span><strong>${order.paymentMethod || "-"}</strong></div>
          <div class="tracking-detail-item"><span>Total</span><strong>${rupiah(order.total)}</strong></div>
          <div class="tracking-detail-item"><span>Dibuat</span><strong>${formatDateTime(order.createdAt)}</strong></div>
          <div class="tracking-detail-item"><span>Update Terakhir</span><strong>${formatDateTime(order.updatedAt)}</strong></div>
        </div>

        <div class="tracking-items">
          <h3 style="margin-bottom: 10px;">Pesanan Kamu</h3>
          ${itemsHtml || `<div class="empty-state">Detail menu tidak tersedia.</div>`}
        </div>
      </div>
    </div>
  `;
}

function listenOrder(code) {
  const cleanCode = String(code || "").trim();

  if (!cleanCode) {
    renderTrackingEmpty();
    return;
  }

  const input = document.getElementById("tracking-code");
  if (input) input.value = cleanCode;

  localStorage.setItem("tuah_last_order_code", cleanCode);

  if (trackingUnsubscribe) trackingUnsubscribe();

  renderTrackingEmpty("Mencari pesanan...");

  trackingUnsubscribe = db.collection("orders").doc(getOrderDocId(cleanCode)).onSnapshot(
    (doc) => {
      if (!doc.exists) {
        renderTrackingEmpty("Pesanan tidak ditemukan. Pastikan kode pesanan sudah benar.");
        return;
      }

      renderTrackingOrder({ id: doc.id, ...doc.data() });
    },
    (error) => {
      console.error("Gagal membaca aktivitas pesanan:", error);
      renderTrackingEmpty("Gagal membaca data pesanan. Cek koneksi internet atau Firestore Rules.");
    },
  );
}

function trackOrderFromInput() {
  const code = document.getElementById("tracking-code")?.value.trim();

  if (!code) {
    alert("Masukkan kode pesanan dulu.");
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("code", code);
  window.history.replaceState({}, "", url.toString());

  listenOrder(code);
}

function initTrackingPage() {
  updateCartCount();

  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get("code");
  const lastCode = localStorage.getItem("tuah_last_order_code");
  const initialCode = codeFromUrl || lastCode || "";

  if (initialCode) {
    listenOrder(initialCode);
  } else {
    renderTrackingEmpty();
  }

  document.getElementById("tracking-code")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") trackOrderFromInput();
  });
}

document.addEventListener("DOMContentLoaded", initTrackingPage);
