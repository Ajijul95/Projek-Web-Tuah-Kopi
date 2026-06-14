// assets/js/barista.js
// Dashboard Barista Tuah Kopi
// Fitur: ringkasan, kelola produk, daftar pesanan realtime, update status, cetak struk, laporan shift PDF.

let baristaProducts = [];
let baristaOrders = [];
let editingBaristaProductId = null;
let ordersListener = null;

function showBaristaSection(sectionName, element) {
  document.querySelectorAll(".dash-section").forEach((section) => section.classList.remove("active"));
  document.querySelectorAll(".sb-item").forEach((item) => item.classList.remove("active"));

  document.getElementById(`barista-section-${sectionName}`)?.classList.add("active");
  element?.classList.add("active");

  const titles = {
    overview: "Ringkasan Barista",
    products: "Kelola Produk",
    orders: "Daftar Pesanan",
    shift: "Laporan Shift",
  };

  document.getElementById("barista-page-title").textContent = titles[sectionName] || "Barista";

  if (sectionName === "shift") renderShiftReport();
}

async function refreshBaristaData() {
  await loadBaristaProducts();
  await loadBaristaOrdersOnce();
  showToast("Data barista diperbarui.");
}

async function loadBaristaProducts() {
  baristaProducts = await getProductsFromFirebase();
  renderBaristaProducts();
  renderBaristaStats();
}

async function loadBaristaOrdersOnce() {
  const snapshot = await db.collection("orders").get();
  baristaOrders = [];

  snapshot.forEach((doc) => {
    baristaOrders.push(normalizeOrder(doc.id, doc.data()));
  });

  sortOrders();
  renderAllOrderViews();
}

function startRealtimeOrders() {
  if (ordersListener) ordersListener();

  ordersListener = db.collection("orders").onSnapshot(
    (snapshot) => {
      baristaOrders = [];

      snapshot.forEach((doc) => {
        baristaOrders.push(normalizeOrder(doc.id, doc.data()));
      });

      sortOrders();
      renderAllOrderViews();
    },
    (error) => {
      console.error("Gagal realtime pesanan:", error);
      loadBaristaOrdersOnce();
    },
  );
}

function normalizeOrder(id, data) {
  return {
    id,
    orderCode: data.orderCode || id,
    customerName: data.customerName || data.name || "-",
    tableNumber: data.tableNumber || data.table || "-",
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total) || 0,
    paymentMethod: data.paymentMethod || "-",
    status: data.status || "baru",
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function sortOrders() {
  baristaOrders.sort((a, b) => {
    const timeA = timestampToMillis(a.createdAt) || Number(String(a.orderCode).replace(/\D/g, "")) || 0;
    const timeB = timestampToMillis(b.createdAt) || Number(String(b.orderCode).replace(/\D/g, "")) || 0;
    return timeB - timeA;
  });
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isToday(value) {
  const millis = timestampToMillis(value);
  if (!millis) return false;

  const date = new Date(millis);
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function renderAllOrderViews() {
  renderActiveOrders();
  renderBaristaOrders();
  renderBaristaStats();
  renderShiftReport();
}

function renderBaristaStats() {
  const activeOrders = baristaOrders.filter((order) => ["baru", "proses", "diantar"].includes(order.status));
  const processOrders = baristaOrders.filter((order) => order.status === "proses" || order.status === "diantar");
  const doneToday = baristaOrders.filter((order) => order.status === "selesai" && isToday(order.createdAt));

  document.getElementById("stat-active-orders").textContent = activeOrders.length;
  document.getElementById("stat-process-orders").textContent = processOrders.length;
  document.getElementById("stat-done-today").textContent = doneToday.length;
  document.getElementById("stat-barista-products").textContent = baristaProducts.length;
}

function itemsText(items) {
  if (!items || !items.length) return "-";
  return items.map((item) => `${item.name || "Menu"} x${item.qty || 1}`).join(", ");
}

function renderOrderRow(order) {
  return `
    <tr>
      <td>${order.orderCode}</td>
      <td>${order.customerName}</td>
      <td>${order.tableNumber}</td>
      <td>${itemsText(order.items)}</td>
      <td>${rupiah(order.total)}</td>
      <td>${order.paymentMethod}</td>
      <td><span class="status-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span></td>
      <td>
        ${order.status !== "proses" && order.status !== "diantar" && order.status !== "selesai" ? `<button class="action-btn" onclick="updateBaristaOrder('${order.id}', 'proses')">Proses</button>` : ""}
        ${order.status !== "diantar" && order.status !== "selesai" ? `<button class="action-btn" onclick="updateBaristaOrder('${order.id}', 'diantar')">Diantar</button>` : ""}
        ${order.status !== "selesai" ? `<button class="action-btn" onclick="updateBaristaOrder('${order.id}', 'selesai')">Selesai</button>` : ""}
        ${order.status !== "batal" ? `<button class="action-btn danger" onclick="updateBaristaOrder('${order.id}', 'batal')">Batal</button>` : ""}
        <button class="action-btn" onclick="printReceipt('${order.id}')">Struk</button>
      </td>
    </tr>
  `;
}

function renderActiveOrders() {
  const tbody = document.getElementById("active-orders-table");
  if (!tbody) return;

  const activeOrders = baristaOrders.filter((order) => ["baru", "proses", "diantar"].includes(order.status));

  if (!activeOrders.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Belum ada pesanan aktif.</td></tr>`;
    return;
  }

  tbody.innerHTML = activeOrders.map(renderOrderRow).join("");
}

function renderBaristaOrders() {
  const tbody = document.getElementById("barista-orders-table");
  if (!tbody) return;

  const keyword = (document.getElementById("barista-order-search")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("barista-order-status-filter")?.value || "semua";
  const paymentFilter = document.getElementById("barista-payment-filter")?.value || "semua";

  let filteredOrders = [...baristaOrders];

  if (keyword) {
    filteredOrders = filteredOrders.filter((order) => {
      return (
        String(order.orderCode).toLowerCase().includes(keyword) ||
        String(order.customerName).toLowerCase().includes(keyword) ||
        String(order.tableNumber).toLowerCase().includes(keyword)
      );
    });
  }

  if (statusFilter !== "semua") {
    filteredOrders = filteredOrders.filter((order) => order.status === statusFilter);
  }

  if (paymentFilter !== "semua") {
    filteredOrders = filteredOrders.filter((order) => order.paymentMethod === paymentFilter);
  }

  if (!filteredOrders.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Pesanan tidak ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredOrders.map(renderOrderRow).join("");
}

async function updateBaristaOrder(id, status) {
  try {
    await db.collection("orders").doc(id).update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showToast(`Status pesanan diubah menjadi ${statusLabel(status)}.`);
  } catch (error) {
    console.error("Gagal update pesanan:", error);
    alert("Gagal update pesanan. Cek Firestore Rules.");
  }
}

function renderBaristaProducts() {
  const grid = document.getElementById("barista-product-grid");
  if (!grid) return;

  const keyword = (document.getElementById("barista-product-search")?.value || "").toLowerCase();
  const category = document.getElementById("barista-product-category-filter")?.value || "semua";

  let filteredProducts = [...baristaProducts];

  if (keyword) {
    filteredProducts = filteredProducts.filter((product) => product.name.toLowerCase().includes(keyword));
  }

  if (category !== "semua") {
    filteredProducts = filteredProducts.filter((product) => product.category === category);
  }

  if (!filteredProducts.length) {
    grid.innerHTML = `<div class="empty-state">Produk tidak ditemukan.</div>`;
    return;
  }

  grid.innerHTML = filteredProducts
    .map((product) => `
      <article class="product-admin-card">
        <div class="product-admin-img">
          ${product.image ? `<img src="${product.image}" alt="${product.name}">` : product.icon}
        </div>
        <div class="product-admin-body">
          <div style="font-size: 11px; color: var(--accent); letter-spacing: 2px; text-transform: uppercase;">
            ${categoryLabel(product.category)}
          </div>
          <div class="p-name">${product.name}</div>
          <div class="p-price">${rupiah(product.price)}</div>
          <div class="p-desc">${product.desc || "-"}</div>
          <div>
            <button class="action-btn" onclick="openBaristaProductModal('${product.id}')">Edit</button>
            <button class="action-btn danger" onclick="deleteBaristaProduct('${product.id}')">Hapus</button>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function setSelectValueWithFallback(selectId, value) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const safeValue = value || "☕";
  const optionExists = Array.from(select.options).some((option) => option.value === safeValue);

  if (!optionExists) {
    const option = document.createElement("option");
    option.value = safeValue;
    option.textContent = safeValue + " Icon tersimpan";
    select.appendChild(option);
  }

  select.value = safeValue;
}

function openBaristaProductModal(id = null) {
  editingBaristaProductId = id;
  const product = baristaProducts.find((item) => item.id === id);

  document.getElementById("barista-product-modal-title").textContent = id ? "Edit Produk" : "Tambah Produk";
  document.getElementById("bp-name").value = product?.name || "";
  document.getElementById("bp-price").value = product?.price || "";
  document.getElementById("bp-category").value = product?.category || "panas";
  document.getElementById("bp-desc").value = product?.desc || "";
  document.getElementById("bp-image").value = product?.image || "";

  const fileInput = document.getElementById("bp-image-file");
  if (fileInput) fileInput.value = "";

  renderBaristaImagePreview(product?.image || "");
  setSelectValueWithFallback("bp-icon", product?.icon || "☕");
  document.getElementById("bp-badge").value = product?.badge || "";
  document.getElementById("barista-product-modal").classList.add("show");
}

function closeBaristaProductModal() {
  editingBaristaProductId = null;
  document.getElementById("barista-product-modal").classList.remove("show");
}

function renderBaristaImagePreview(imageUrl) {
  const preview = document.getElementById("bp-image-preview");
  if (!preview) return;

  if (!imageUrl) {
    preview.innerHTML = "";
    return;
  }

  preview.innerHTML = `<img src="${imageUrl}" alt="Preview gambar produk">`;
}

async function uploadBaristaProductImage(file, productId) {
  if (!file) return "";

  if (!storage) {
    throw new Error("Firebase Storage belum aktif.");
  }

  const safeExt = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const fileName = `${productId}-${Date.now()}.${safeExt}`;
  const storageRef = storage.ref(`products/${fileName}`);

  await storageRef.put(file);
  return await storageRef.getDownloadURL();
}

function setupBaristaImageInputs() {
  const imageInput = document.getElementById("bp-image");
  const fileInput = document.getElementById("bp-image-file");

  imageInput?.addEventListener("input", () => {
    renderBaristaImagePreview(imageInput.value.trim());
  });

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    renderBaristaImagePreview(URL.createObjectURL(file));
  });
}

async function saveBaristaProduct() {
  const name = document.getElementById("bp-name").value.trim();
  const price = Number(document.getElementById("bp-price").value);
  const category = document.getElementById("bp-category").value;
  const desc = document.getElementById("bp-desc").value.trim();
  let image = document.getElementById("bp-image").value.trim();
  const imageFile = document.getElementById("bp-image-file")?.files?.[0] || null;
  const icon = document.getElementById("bp-icon").value.trim() || "☕";
  const badge = document.getElementById("bp-badge").value.trim();

  if (!name) {
    alert("Nama produk wajib diisi.");
    return;
  }

  if (!price || price <= 0) {
    alert("Harga wajib diisi dan harus lebih dari 0.");
    return;
  }

  const newId = slugify(name);
  const docId = editingBaristaProductId || newId;

  try {
    if (imageFile) {
      image = await uploadBaristaProductImage(imageFile, newId);
      document.getElementById("bp-image").value = image;
    }
  } catch (error) {
    console.error("Gagal upload gambar:", error);
    alert("Gagal upload gambar. Cek Firebase Storage dan rules-nya.");
    return;
  }

  const productData = {
    name,
    price,
    category,
    desc,
    image,
    icon,
    badge,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (editingBaristaProductId && editingBaristaProductId !== newId) {
      await db.collection("products").doc(newId).set(productData, { merge: true });
      await db.collection("products").doc(editingBaristaProductId).delete();
    } else {
      await db.collection("products").doc(docId).set(
        {
          ...productData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    closeBaristaProductModal();
    await loadBaristaProducts();
    showToast("Produk berhasil disimpan.");
  } catch (error) {
    console.error("Gagal menyimpan produk:", error);
    alert("Gagal menyimpan produk. Cek Firestore Rules.");
  }
}

async function deleteBaristaProduct(id) {
  if (!confirm("Hapus menu ini?")) return;

  try {
    await db.collection("products").doc(id).delete();
    await loadBaristaProducts();
    showToast("Produk berhasil dihapus.");
  } catch (error) {
    console.error("Gagal hapus produk:", error);
    alert("Gagal menghapus produk. Cek Firestore Rules.");
  }
}

function printReceipt(id) {
  const order = baristaOrders.find((item) => item.id === id);
  if (!order) return;

  const items = order.items
    .map((item) => `
      <tr>
        <td>${item.name || "Menu"} x${item.qty || 1}</td>
        <td style="text-align:right;">${rupiah((Number(item.price) || 0) * (Number(item.qty) || 1))}</td>
      </tr>
    `)
    .join("");

  const receiptWindow = window.open("", "_blank", "width=420,height=640");
  receiptWindow.document.write(`
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Struk ${order.orderCode}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1a0f08; }
          h2, p { text-align: center; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          td { padding: 6px 0; border-bottom: 1px dashed #ddd; font-size: 14px; }
          .row { display: flex; justify-content: space-between; font-size: 14px; margin: 8px 0; }
          .total { font-weight: bold; font-size: 18px; border-top: 2px solid #1a0f08; padding-top: 12px; }
          .thanks { margin-top: 24px; font-size: 13px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h2>☕ Tuah Kopi</h2>
        <p>Struk Pesanan</p>
        <div class="row"><span>Kode</span><strong>${order.orderCode}</strong></div>
        <div class="row"><span>Pelanggan</span><strong>${order.customerName}</strong></div>
        <div class="row"><span>Meja</span><strong>${order.tableNumber}</strong></div>
        <div class="row"><span>Pembayaran</span><strong>${order.paymentMethod}</strong></div>
        <table>${items}</table>
        <div class="row total"><span>Total</span><span>${rupiah(order.total)}</span></div>
        <p class="thanks">Terima kasih sudah membeli di Tuah Kopi.</p>
        <button onclick="window.print()" style="width:100%;padding:12px;margin-top:20px;">Print Struk</button>
      </body>
    </html>
  `);
  receiptWindow.document.close();
}

function renderShiftReport() {
  const preview = document.getElementById("shift-report-preview");
  if (!preview) return;

  const todayOrders = baristaOrders.filter((order) => isToday(order.createdAt) || isToday(order.updatedAt));
  const totalIncome = todayOrders
    .filter((order) => order.status === "selesai")
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const cashOrders = todayOrders.filter((order) => order.paymentMethod === "Cash").length;
  const qrOrders = todayOrders.filter((order) => order.paymentMethod === "QR").length;
  const doneOrders = todayOrders.filter((order) => order.status === "selesai").length;
  const processOrders = todayOrders.filter((order) => order.status === "proses" || order.status === "diantar").length;
  const newOrders = todayOrders.filter((order) => order.status === "baru").length;

  preview.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="s-label">Pesanan Hari Ini</div><div class="s-val">${todayOrders.length}</div></div>
      <div class="stat-card"><div class="s-label">Selesai</div><div class="s-val">${doneOrders}</div></div>
      <div class="stat-card"><div class="s-label">QR / Cash</div><div class="s-val" style="font-size:22px;">${qrOrders} / ${cashOrders}</div></div>
      <div class="stat-card"><div class="s-label">Pendapatan Selesai</div><div class="s-val" style="font-size:22px;">${rupiah(totalIncome)}</div></div>
    </div>
    <div style="margin-top:16px;line-height:1.9;color:var(--text);">
      <strong>Ringkasan Shift:</strong><br>
      Pesanan baru: ${newOrders}<br>
      Pesanan diproses: ${processOrders}<br>
      Pesanan selesai: ${doneOrders}<br>
      Total transaksi QR: ${qrOrders}<br>
      Total transaksi Cash: ${cashOrders}<br>
    </div>
  `;
}

function exportShiftPDF() {
  if (!window.jspdf) {
    alert("Library jsPDF belum diload.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const todayOrders = baristaOrders.filter((order) => isToday(order.createdAt) || isToday(order.updatedAt));
  const totalIncome = todayOrders
    .filter((order) => order.status === "selesai")
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const today = new Date().toLocaleDateString("id-ID");

  doc.setFontSize(16);
  doc.text("Laporan Shift Barista - Tuah Kopi", 14, 18);
  doc.setFontSize(11);
  doc.text(`Tanggal: ${today}`, 14, 30);
  doc.text(`Total Pesanan Hari Ini: ${todayOrders.length}`, 14, 40);
  doc.text(`Total Pendapatan Selesai: ${rupiah(totalIncome)}`, 14, 50);

  let y = 66;
  doc.text("Daftar Pesanan", 14, y);
  y += 8;

  todayOrders.forEach((order, index) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }

    doc.text(`${index + 1}. ${order.orderCode} - ${order.customerName} - Meja ${order.tableNumber}`, 14, y);
    y += 6;
    doc.text(`   ${itemsText(order.items).substring(0, 90)}`, 14, y);
    y += 6;
    doc.text(`   ${rupiah(order.total)} | ${order.paymentMethod} | ${statusLabel(order.status)}`, 14, y);
    y += 8;
  });

  doc.save(`laporan-shift-barista-${today.replaceAll("/", "-")}.pdf`);
}

function logoutBarista() {
  clearCurrentUser();
  window.location.href = "../login.html";
}

async function initBarista() {
  const currentUser = getCurrentUser();
  if (currentUser?.name) {
    document.getElementById("barista-name").textContent = currentUser.name;
  }

  setupBaristaImageInputs();
  await loadBaristaProducts();
  startRealtimeOrders();
}

document.addEventListener("DOMContentLoaded", initBarista);
