// assets/js/admin.js

let products = [];
let orders = [];
let baristas = [];
let editingProductId = null;
let editingBaristaId = null;

function showSection(sectionName, element) {
  document.querySelectorAll(".dash-section").forEach((section) => section.classList.remove("active"));
  document.querySelectorAll(".sb-item").forEach((item) => item.classList.remove("active"));

  document.getElementById(`section-${sectionName}`)?.classList.add("active");
  element?.classList.add("active");

  const titles = {
    overview: "Ringkasan",
    products: "Kelola Menu",
    orders: "Daftar Pesanan",
    baristas: "Akun Barista",
    reports: "Laporan Bulanan",
  };

  document.getElementById("page-title").textContent = titles[sectionName] || "Dashboard";

  if (sectionName === "reports") renderReportPreview();
}

async function loadProducts() {
  products = await getProductsFromFirebase();
  renderAdminProducts();
  renderStats();
}

async function loadOrders() {
  const snapshot = await db.collection("orders").get();
  orders = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    orders.push({
      id: doc.id,
      orderCode: data.orderCode || doc.id,
      customerName: data.customerName || "-",
      tableNumber: data.tableNumber || "-",
      items: Array.isArray(data.items) ? data.items : [],
      total: Number(data.total) || 0,
      paymentMethod: data.paymentMethod || "-",
      status: data.status || "baru",
      createdAt: data.createdAt || null,
    });
  });

  orders.sort((a, b) => String(b.orderCode).localeCompare(String(a.orderCode)));
  renderOrders();
  renderOverviewOrders();
  renderStats();
}

async function loadBaristas() {
  const snapshot = await db.collection("baristas").get();
  baristas = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    baristas.push({
      id: doc.id,
      name: data.name || "-",
      username: data.username || doc.id,
      password: data.password || "",
      status: data.status || "aktif",
    });
  });

  renderBaristas();
}

function renderStats() {
  const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);

  document.getElementById("stat-products").textContent = products.length;
  document.getElementById("stat-orders").textContent = orders.length;
  document.getElementById("stat-new").textContent = orders.filter((order) => order.status === "baru").length;
  document.getElementById("stat-income").textContent = rupiah(totalIncome);
}

function renderAdminProducts() {
  const grid = document.getElementById("admin-product-grid");
  const keyword = (document.getElementById("product-search")?.value || "").toLowerCase();
  const category = document.getElementById("product-category-filter")?.value || "semua";

  let filteredProducts = products;

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
            <button class="action-btn" onclick="openProductModal('${product.id}')">Edit</button>
            <button class="action-btn danger" onclick="deleteProduct('${product.id}')">Hapus</button>
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

function openProductModal(id = null) {
  editingProductId = id;
  const product = products.find((item) => item.id === id);

  document.getElementById("product-modal-title").textContent = id ? "Edit Produk" : "Tambah Produk";
  document.getElementById("p-name").value = product?.name || "";
  document.getElementById("p-price").value = product?.price || "";
  document.getElementById("p-category").value = product?.category || "panas";
  document.getElementById("p-desc").value = product?.desc || "";
  document.getElementById("p-image").value = product?.image || "";
  const imageFileInput = document.getElementById("p-image-file");
  if (imageFileInput) imageFileInput.value = "";
  renderProductImagePreview(product?.image || "");
  setSelectValueWithFallback("p-icon", product?.icon || "☕");
  document.getElementById("p-badge").value = product?.badge || "";

  document.getElementById("product-modal").classList.add("show");
}

function closeProductModal() {
  editingProductId = null;
  document.getElementById("product-modal").classList.remove("show");
}

function renderProductImagePreview(imageUrl) {
  const preview = document.getElementById("p-image-preview");
  if (!preview) return;

  if (!imageUrl) {
    preview.innerHTML = "";
    return;
  }

  preview.innerHTML = `<img src="${imageUrl}" alt="Preview gambar produk">`;
}

async function uploadProductImage(file, productId) {
  if (!file) return "";

  if (!storage) {
    throw new Error("Firebase Storage belum aktif. Pastikan firebase-storage-compat.js sudah diload.");
  }

  const safeExt = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const fileName = `${productId}-${Date.now()}.${safeExt}`;
  const storageRef = storage.ref(`products/${fileName}`);

  await storageRef.put(file);
  return await storageRef.getDownloadURL();
}

function setupImageInputs() {
  const imageUrlInput = document.getElementById("p-image");
  const imageFileInput = document.getElementById("p-image-file");

  imageUrlInput?.addEventListener("input", () => {
    renderProductImagePreview(imageUrlInput.value.trim());
  });

  imageFileInput?.addEventListener("change", () => {
    const file = imageFileInput.files && imageFileInput.files[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    renderProductImagePreview(objectUrl);
  });
}

async function saveProduct() {
  const name = document.getElementById("p-name").value.trim();
  const price = Number(document.getElementById("p-price").value);
  const category = document.getElementById("p-category").value;
  const desc = document.getElementById("p-desc").value.trim();
  let image = document.getElementById("p-image").value.trim();
  const imageFile = document.getElementById("p-image-file")?.files?.[0] || null;
  const icon = document.getElementById("p-icon").value.trim() || "☕";
  const badge = document.getElementById("p-badge").value.trim();

  if (!name) {
    alert("Nama produk wajib diisi.");
    return;
  }

  if (!price || price <= 0) {
    alert("Harga wajib diisi dan harus lebih dari 0.");
    return;
  }

  const newId = slugify(name);
  const docId = editingProductId || newId;

  try {
    if (imageFile) {
      image = await uploadProductImage(imageFile, newId);
      document.getElementById("p-image").value = image;
    }
  } catch (error) {
    console.error("Gagal upload gambar:", error);
    alert("Gagal upload gambar ke Firebase Storage. Cek Storage Rules atau koneksi internet.");
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
    if (editingProductId && editingProductId !== newId) {
      await db.collection("products").doc(newId).set(productData, { merge: true });
      await db.collection("products").doc(editingProductId).delete();
    } else {
      await db.collection("products").doc(docId).set(
        {
          ...productData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    closeProductModal();
    await loadProducts();
    showToast("Produk berhasil disimpan ke Firebase.");
  } catch (error) {
    console.error("Gagal menyimpan produk:", error);
    alert("Gagal menyimpan produk ke Firebase. Cek Firestore Rules.");
  }
}

async function deleteProduct(id) {
  if (!confirm("Hapus menu ini?")) return;

  try {
    await db.collection("products").doc(id).delete();
    await loadProducts();
    showToast("Produk berhasil dihapus dari Firebase.");
  } catch (error) {
    console.error("Gagal hapus produk:", error);
    alert("Gagal menghapus produk. Cek Firestore Rules.");
  }
}

function itemsText(items) {
  if (!items.length) return "-";
  return items.map((item) => `${item.name} x${item.qty}`).join(", ");
}

function renderOrders() {
  const tbody = document.getElementById("orders-table");
  const statusFilter = document.getElementById("order-status-filter")?.value || "semua";
  const paymentFilter = document.getElementById("payment-filter")?.value || "semua";

  let filteredOrders = orders;

  if (statusFilter !== "semua") {
    filteredOrders = filteredOrders.filter((order) => order.status === statusFilter);
  }

  if (paymentFilter !== "semua") {
    filteredOrders = filteredOrders.filter((order) => order.paymentMethod === paymentFilter);
  }

  if (!filteredOrders.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Belum ada pesanan.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredOrders
    .map((order) => `
      <tr>
        <td>${order.orderCode}</td>
        <td>${order.customerName}</td>
        <td>${order.tableNumber}</td>
        <td>${itemsText(order.items)}</td>
        <td>${rupiah(order.total)}</td>
        <td>${order.paymentMethod}</td>
        <td><span class="status-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span></td>
        <td>
          <button class="action-btn" onclick="updateOrderStatus('${order.id}', 'proses')">Proses</button>
          <button class="action-btn" onclick="updateOrderStatus('${order.id}', 'diantar')">Diantar</button>
          <button class="action-btn" onclick="updateOrderStatus('${order.id}', 'selesai')">Selesai</button>
          <button class="action-btn danger" onclick="updateOrderStatus('${order.id}', 'batal')">Batal</button>
        </td>
      </tr>
    `)
    .join("");
}

function renderOverviewOrders() {
  const tbody = document.getElementById("overview-orders-table");
  const latestOrders = orders.slice(0, 5);

  if (!latestOrders.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada pesanan.</td></tr>`;
    return;
  }

  tbody.innerHTML = latestOrders
    .map((order) => `
      <tr>
        <td>${order.orderCode}</td>
        <td>${order.customerName}</td>
        <td>${order.tableNumber}</td>
        <td>${rupiah(order.total)}</td>
        <td>${order.paymentMethod}</td>
        <td><span class="status-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span></td>
      </tr>
    `)
    .join("");
}

async function updateOrderStatus(id, status) {
  try {
    await db.collection("orders").doc(id).update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await loadOrders();
    showToast("Status pesanan diperbarui.");
  } catch (error) {
    console.error("Gagal update status:", error);
    alert("Gagal update status pesanan.");
  }
}

function renderBaristas() {
  const tbody = document.getElementById("baristas-table");

  if (!baristas.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada akun barista tambahan.</td></tr>`;
    return;
  }

  tbody.innerHTML = baristas
    .map((barista) => `
      <tr>
        <td>${barista.name}</td>
        <td>${barista.username}</td>
        <td>${barista.status}</td>
        <td>
          <button class="action-btn" onclick="openBaristaModal('${barista.id}')">Edit</button>
          <button class="action-btn danger" onclick="deleteBarista('${barista.id}')">Hapus</button>
        </td>
      </tr>
    `)
    .join("");
}

function openBaristaModal(id = null) {
  editingBaristaId = id;
  const barista = baristas.find((item) => item.id === id);

  document.getElementById("barista-modal-title").textContent = id ? "Edit Barista" : "Tambah Barista";
  document.getElementById("b-name").value = barista?.name || "";
  document.getElementById("b-username").value = barista?.username || "";
  document.getElementById("b-password").value = barista?.password || "";
  document.getElementById("b-status").value = barista?.status || "aktif";

  document.getElementById("barista-modal").classList.add("show");
}

function closeBaristaModal() {
  editingBaristaId = null;
  document.getElementById("barista-modal").classList.remove("show");
}

async function saveBarista() {
  const name = document.getElementById("b-name").value.trim();
  const username = document.getElementById("b-username").value.trim();
  const password = document.getElementById("b-password").value.trim();
  const status = document.getElementById("b-status").value;

  if (!name || !username || !password) {
    alert("Nama, username, dan password wajib diisi.");
    return;
  }

  const newId = slugify(username);
  const docId = editingBaristaId || newId;

  try {
    if (editingBaristaId && editingBaristaId !== newId) {
      await db.collection("baristas").doc(newId).set({ name, username, password, status }, { merge: true });
      await db.collection("baristas").doc(editingBaristaId).delete();
    } else {
      await db.collection("baristas").doc(docId).set({
        name,
        username,
        password,
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    closeBaristaModal();
    await loadBaristas();
    showToast("Akun barista berhasil disimpan.");
  } catch (error) {
    console.error("Gagal simpan barista:", error);
    alert("Gagal menyimpan akun barista.");
  }
}

async function deleteBarista(id) {
  if (!confirm("Hapus akun barista ini?")) return;

  try {
    await db.collection("baristas").doc(id).delete();
    await loadBaristas();
    showToast("Akun barista dihapus.");
  } catch (error) {
    console.error("Gagal hapus barista:", error);
    alert("Gagal menghapus akun barista.");
  }
}

function renderReportPreview() {
  const preview = document.getElementById("report-preview");
  const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);
  const qrOrders = orders.filter((order) => order.paymentMethod === "QR").length;
  const cashOrders = orders.filter((order) => order.paymentMethod === "Cash").length;

  preview.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="s-label">Total Pesanan</div><div class="s-val">${orders.length}</div></div>
      <div class="stat-card"><div class="s-label">Total Pendapatan</div><div class="s-val" style="font-size: 22px;">${rupiah(totalIncome)}</div></div>
      <div class="stat-card"><div class="s-label">Pembayaran QR</div><div class="s-val">${qrOrders}</div></div>
      <div class="stat-card"><div class="s-label">Pembayaran Cash</div><div class="s-val">${cashOrders}</div></div>
    </div>
    <p style="color: var(--muted);">Klik tombol Export PDF untuk menyimpan laporan bulanan.</p>
  `;
}

function exportMonthlyPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const now = new Date();
  const monthName = now.toLocaleString("id-ID", { month: "long" });
  const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);

  pdf.setFontSize(16);
  pdf.text("Laporan Bulanan Tuah Kopi", 14, 18);
  pdf.setFontSize(11);
  pdf.text(`Periode: ${monthName} ${now.getFullYear()}`, 14, 30);
  pdf.text(`Total Pesanan: ${orders.length}`, 14, 40);
  pdf.text(`Total Pendapatan: ${rupiah(totalIncome)}`, 14, 50);

  let y = 66;
  pdf.text("No", 14, y);
  pdf.text("Kode", 25, y);
  pdf.text("Pelanggan", 58, y);
  pdf.text("Bayar", 108, y);
  pdf.text("Status", 132, y);
  pdf.text("Total", 160, y);
  y += 8;

  orders.forEach((order, index) => {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }

    pdf.text(String(index + 1), 14, y);
    pdf.text(String(order.orderCode).substring(0, 16), 25, y);
    pdf.text(String(order.customerName).substring(0, 20), 58, y);
    pdf.text(String(order.paymentMethod), 108, y);
    pdf.text(statusLabel(order.status), 132, y);
    pdf.text(rupiah(order.total), 160, y);
    y += 8;
  });

  pdf.save(`laporan-tuah-kopi-${monthName}-${now.getFullYear()}.pdf`);
}

function logoutAdmin() {
  clearCurrentUser();
  window.location.href = "../login.html";
}

async function initAdmin() {
  setupImageInputs();
  await loadProducts();
  await loadOrders();
  await loadBaristas();
}

document.addEventListener("DOMContentLoaded", initAdmin);
