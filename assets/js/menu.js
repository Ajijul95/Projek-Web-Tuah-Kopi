// assets/js/menu.js

let menuProducts = [];

async function loadMenuPage() {
  updateCartCount();
  menuProducts = await getProductsFromFirebase();
  renderProductCards(menuProducts, "menu-grid");
}

function filterMenu(category, element) {
  document.querySelectorAll(".filter-btn").forEach((button) => button.classList.remove("active"));
  if (element) element.classList.add("active");

  const filteredProducts = category === "semua"
    ? menuProducts
    : menuProducts.filter((product) => product.category === category);

  renderProductCards(filteredProducts, "menu-grid");
}

document.addEventListener("DOMContentLoaded", loadMenuPage);
