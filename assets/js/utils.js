// assets/js/utils.js

function rupiah(value) {
  return "Rp " + (Number(value) || 0).toLocaleString("id-ID");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "produk_tanpa_nama";
}

function categoryLabel(category) {
  const labels = {
    panas: "Kopi Panas",
    dingin: "Kopi Dingin",
    signature: "Signature",
    nonkopi: "Non-Kopi",
  };

  return labels[category] || category || "-";
}

function statusLabel(status) {
  const labels = {
    baru: "Baru",
    proses: "Diproses",
    diantar: "Diantar",
    selesai: "Selesai",
    batal: "Batal",
  };

  return labels[status] || status || "-";
}

function statusClass(status) {
  if (status === "baru") return "pill-new";
  if (status === "proses") return "pill-process";
  if (status === "diantar") return "pill-deliver";
  if (status === "selesai") return "pill-done";
  if (status === "batal") return "pill-cancel";
  return "pill-new";
}

function showToast(message) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function setCurrentUser(user) {
  localStorage.setItem("tuah_current_user", JSON.stringify(user));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("tuah_current_user"));
  } catch (error) {
    return null;
  }
}

function clearCurrentUser() {
  localStorage.removeItem("tuah_current_user");
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("tuah_cart")) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("tuah_cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const countElement = document.getElementById("cart-count");
  if (!countElement) return;

  const count = getCart().reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  countElement.textContent = count;
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      icon: product.icon || "☕",
      qty: 1,
    });
  }

  saveCart(cart);
  showToast(`${product.name} ditambahkan ke keranjang.`);
}

async function getProductsFromFirebase() {
  const snapshot = await db.collection("products").get();
  const products = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    products.push({
      id: doc.id,
      name: data.name || "Tanpa Nama",
      price: Number(data.price) || 0,
      category: data.category || "panas",
      desc: data.desc || "",
      image: data.image || "",
      icon: data.icon || "☕",
      badge: data.badge || "",
    });
  });

  products.sort((a, b) => a.name.localeCompare(b.name));
  return products;
}

function renderProductCards(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `<div class="empty-state">Belum ada produk di Firebase.</div>`;
    return;
  }

  container.innerHTML = products
    .map((product) => {
      const safeProduct = encodeURIComponent(JSON.stringify(product));

      return `
        <article class="menu-card">
          <div class="menu-img">
            ${product.image ? `<img src="${product.image}" alt="${product.name}">` : product.icon}
            ${product.badge ? `<span class="menu-badge">${product.badge}</span>` : ""}
          </div>
          <div class="menu-body">
            <div class="menu-cat">${categoryLabel(product.category)}</div>
            <div class="menu-name">${product.name}</div>
            <div class="menu-desc">${product.desc || "-"}</div>
            <div class="menu-footer">
              <span class="menu-price">${rupiah(product.price)}</span>
              <button class="add-btn" onclick="addToCart(JSON.parse(decodeURIComponent('${safeProduct}')))">+</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}
