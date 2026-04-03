/* ============================================
   DARE DOLLZ — Shopify Integration
   Uses shopify-buy SDK (loaded via CDN)
============================================ */

const SHOPIFY_DOMAIN = 'daredollz95.myshopify.com';
const STOREFRONT_TOKEN = 'a5ca2da2557cac0fb7f2e56f5b4bd1d8';
const CHECKOUT_STORAGE_KEY = 'shopify_checkout_id';

let shopifyClient;
let checkout;

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

    if (!products.length) {
      grid.innerHTML = '<p class="products-empty">No products available yet. Check back soon!</p>';
      return;
    }

    grid.innerHTML = '';

    products.forEach(product => {
      const image = product.images.length ? product.images[0].src : '';
      const price = product.variants[0].price.amount || product.variants[0].price;
      const available = product.variants[0].available;
      const variantId = product.variants[0].id;

      const card = document.createElement('div');
      card.className = 'product-card reveal';
      card.innerHTML = `
        <div class="product-img-wrap">
          ${image ? `<img src="${image}" alt="${product.title}" class="product-img">` : '<div class="product-img-placeholder"></div>'}
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.title}</h3>
          <p class="product-price">${formatPrice(price)}</p>
          <button class="btn btn-primary product-atc" data-variant="${variantId}" ${!available ? 'disabled' : ''}>
            ${available ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Attach add-to-cart handlers
    grid.querySelectorAll('.product-atc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const variantId = e.target.dataset.variant;
        e.target.textContent = 'Adding...';
        e.target.disabled = true;
        await addToCart(variantId, 1);
        e.target.textContent = 'Added!';
        setTimeout(() => {
          e.target.textContent = 'Add to Cart';
          e.target.disabled = false;
        }, 1500);
      });
    });

    // Re-observe new .reveal elements
    if (typeof observeReveals === 'function') observeReveals();

  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = '<p class="products-empty">Unable to load products. Please try again later.</p>';
  }
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
});
