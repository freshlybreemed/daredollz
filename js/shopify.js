/* ============================================
   DARE DOLLZ — Shopify Integration
   Uses shopify-buy SDK (loaded via CDN)
============================================ */

const SHOPIFY_DOMAIN = 'daredollz95.myshopify.com';
const STOREFRONT_TOKEN = 'a5ca2da2557cac0fb7f2e56f5b4bd1d8';
const CHECKOUT_STORAGE_KEY = 'shopify_checkout_id';

let shopifyClient;
let checkout;
let allProducts = [];        // cache fetched products for the detail modal
let activeProduct = null;    // product currently shown in the modal
let activeVariant = null;    // variant resolved from the selected options

function formatPrice(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ── Initialize client & checkout ──
async function initShopify() {
  shopifyClient = ShopifyBuy.buildClient({
    domain: SHOPIFY_DOMAIN,
    storefrontAccessToken: STOREFRONT_TOKEN,
  });

  // Restore or create checkout
  const existingId = localStorage.getItem(CHECKOUT_STORAGE_KEY);

  if (existingId && existingId !== 'null') {
    try {
      checkout = await shopifyClient.checkout.fetch(existingId);
      if (checkout.completedAt) {
        checkout = await shopifyClient.checkout.create();
      }
    } catch {
      checkout = await shopifyClient.checkout.create();
    }
  } else {
    checkout = await shopifyClient.checkout.create();
  }

  localStorage.setItem(CHECKOUT_STORAGE_KEY, checkout.id);
  updateCartUI();
  loadProducts();
}

// ── Load & render products ──
async function loadProducts() {
  const grid = document.getElementById('products-grid');

  try {
    const products = await shopifyClient.product.fetchAll(25);
    allProducts = products;

    if (!products.length) {
      grid.innerHTML = '<p class="products-empty">No products available yet. Check back soon!</p>';
      return;
    }

    grid.innerHTML = '';

    products.forEach(product => {
      const image = product.images.length ? product.images[0].src : '';
      const price = product.variants[0].price.amount || product.variants[0].price;
      const soldOut = !product.variants.some(v => v.available);

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'product-card reveal';
      card.dataset.id = product.id;
      card.innerHTML = `
        <div class="product-img-wrap">
          ${image ? `<img src="${image}" alt="${product.title}" class="product-img">` : '<div class="product-img-placeholder"></div>'}
          ${soldOut ? '<span class="product-badge">Sold Out</span>' : ''}
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.title}</h3>
          <p class="product-price">${formatPrice(price)}</p>
          <span class="product-view">View Details</span>
        </div>
      `;
      card.addEventListener('click', () => openProductModal(product.id));
      grid.appendChild(card);
    });

    // Re-observe new .reveal elements
    if (typeof observeReveals === 'function') observeReveals();

  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = '<p class="products-empty">Unable to load products. Please try again later.</p>';
  }
}

// ── Product detail modal ──
function openProductModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  activeProduct = product;
  activeVariant = product.variants.find(v => v.available) || product.variants[0];

  const overlay = document.getElementById('product-overlay');
  const titleEl = document.getElementById('pm-title');
  const descEl = document.getElementById('pm-desc');
  const optionsEl = document.getElementById('pm-options');
  const qtyEl = document.getElementById('pm-qty-value');

  titleEl.textContent = product.title;
  descEl.innerHTML = product.descriptionHtml || '';
  if (qtyEl) qtyEl.textContent = '1';

  // Build one selector group per product option (e.g. Size, Color)
  const realOptions = (product.options || []).filter(
    opt => !(opt.values.length === 1 && opt.values[0].value === 'Default Title')
  );

  optionsEl.innerHTML = realOptions.map(opt => `
    <div class="pm-option" data-name="${opt.name}">
      <p class="pm-option-label">${opt.name}</p>
      <div class="pm-option-values">
        ${opt.values.map(v => `
          <button type="button" class="pm-swatch" data-name="${opt.name}" data-value="${v.value}">${v.value}</button>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Seed selected swatches from the resolved active variant
  activeVariant.selectedOptions.forEach(sel => {
    const btn = optionsEl.querySelector(
      `.pm-swatch[data-name="${CSS.escape(sel.name)}"][data-value="${CSS.escape(sel.value)}"]`
    );
    if (btn) btn.classList.add('selected');
  });

  optionsEl.querySelectorAll('.pm-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      optionsEl
        .querySelectorAll(`.pm-swatch[data-name="${CSS.escape(btn.dataset.name)}"]`)
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      resolveVariant();
    });
  });

  renderVariantState();
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Find the variant matching the currently selected swatches
function resolveVariant() {
  if (!activeProduct) return;
  const optionsEl = document.getElementById('pm-options');
  const chosen = {};
  optionsEl.querySelectorAll('.pm-swatch.selected').forEach(b => {
    chosen[b.dataset.name] = b.dataset.value;
  });

  activeVariant = activeProduct.variants.find(v =>
    v.selectedOptions.every(o => chosen[o.name] === undefined || chosen[o.name] === o.value)
  ) || activeVariant;

  renderVariantState();
}

// Sync image, price and ATC button to the active variant
function renderVariantState() {
  if (!activeVariant) return;
  const imgEl = document.getElementById('pm-img');
  const priceEl = document.getElementById('pm-price');
  const atcBtn = document.getElementById('pm-atc');

  const img = (activeVariant.image && activeVariant.image.src) ||
    (activeProduct.images.length ? activeProduct.images[0].src : '');
  if (img) {
    imgEl.src = img;
    imgEl.style.display = '';
  } else {
    imgEl.style.display = 'none';
  }

  const price = activeVariant.price.amount || activeVariant.price;
  priceEl.textContent = formatPrice(price);

  if (activeVariant.available) {
    atcBtn.disabled = false;
    atcBtn.textContent = 'Add to Cart';
  } else {
    atcBtn.disabled = true;
    atcBtn.textContent = 'Sold Out';
  }
}

function closeProductModal() {
  document.getElementById('product-overlay').classList.remove('open');
  document.body.style.overflow = '';
  activeProduct = null;
  activeVariant = null;
}

// ── Cart operations ──
async function addToCart(variantId, quantity) {
  checkout = await shopifyClient.checkout.addLineItems(checkout.id, [
    { variantId, quantity },
  ]);
  localStorage.setItem(CHECKOUT_STORAGE_KEY, checkout.id);
  updateCartUI();
  openCart();
}

async function removeFromCart(lineItemId) {
  checkout = await shopifyClient.checkout.removeLineItems(checkout.id, [lineItemId]);
  localStorage.setItem(CHECKOUT_STORAGE_KEY, checkout.id);
  updateCartUI();
}

async function updateQuantity(lineItemId, quantity) {
  if (quantity < 1) {
    return removeFromCart(lineItemId);
  }
  checkout = await shopifyClient.checkout.updateLineItems(checkout.id, [
    { id: lineItemId, quantity },
  ]);
  localStorage.setItem(CHECKOUT_STORAGE_KEY, checkout.id);
  updateCartUI();
}

// ── Cart UI ──
function updateCartUI() {
  const items = checkout.lineItems || [];
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cart-count');
  const itemsEl = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');
  const subtotalEl = document.getElementById('cart-subtotal');

  // Badge
  if (countEl) {
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  if (!items.length) {
    itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    footerEl.style.display = 'none';
    return;
  }

  footerEl.style.display = '';
  const subtotal = checkout.subtotalPrice
    ? (checkout.subtotalPrice.amount || checkout.subtotalPrice)
    : 0;
  subtotalEl.textContent = formatPrice(subtotal);

  itemsEl.innerHTML = items.map(item => {
    const img = item.variant.image ? item.variant.image.src : '';
    const price = item.variant.price.amount || item.variant.price;
    return `
      <div class="cart-item">
        ${img ? `<img src="${img}" alt="${item.title}" class="cart-item-img">` : ''}
        <div class="cart-item-details">
          <p class="cart-item-title">${item.title}</p>
          ${item.variant.title !== 'Default Title' ? `<p class="cart-item-variant">${item.variant.title}</p>` : ''}
          <p class="cart-item-price">${formatPrice(price)}</p>
          <div class="cart-item-qty">
            <button class="qty-btn" data-id="${item.id}" data-action="minus">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" data-id="${item.id}" data-action="plus">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-id="${item.id}">&times;</button>
      </div>
    `;
  }).join('');

  // Quantity buttons
  itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = items.find(i => i.id === id);
      const newQty = btn.dataset.action === 'plus' ? item.quantity + 1 : item.quantity - 1;
      updateQuantity(id, newQty);
    });
  });

  // Remove buttons
  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
}

// ── Event listeners ──
document.addEventListener('DOMContentLoaded', () => {
  initShopify();

  document.getElementById('cart-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    openCart();
  });

  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);

  document.getElementById('cart-checkout')?.addEventListener('click', () => {
    if (checkout?.webUrl) {
      window.open(checkout.webUrl);
    }
  });

  // ── Product detail modal ──
  const productOverlay = document.getElementById('product-overlay');
  document.getElementById('pm-close')?.addEventListener('click', closeProductModal);
  productOverlay?.addEventListener('click', (e) => {
    if (e.target === productOverlay) closeProductModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && productOverlay?.classList.contains('open')) closeProductModal();
  });

  // Quantity stepper
  const qtyEl = document.getElementById('pm-qty-value');
  document.getElementById('pm-qty-minus')?.addEventListener('click', () => {
    const q = Math.max(1, parseInt(qtyEl.textContent, 10) - 1);
    qtyEl.textContent = q;
  });
  document.getElementById('pm-qty-plus')?.addEventListener('click', () => {
    const q = Math.min(99, parseInt(qtyEl.textContent, 10) + 1);
    qtyEl.textContent = q;
  });

  // Add to cart from the modal
  document.getElementById('pm-atc')?.addEventListener('click', async (e) => {
    if (!activeVariant || !activeVariant.available) return;
    const btn = e.currentTarget;
    const qty = parseInt(qtyEl.textContent, 10) || 1;
    btn.textContent = 'Adding...';
    btn.disabled = true;
    await addToCart(activeVariant.id, qty);
    closeProductModal();
  });
});
