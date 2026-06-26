/* ════════════════════════════════════════════════════════════
   BARKLEY PET — SHARED CART ENGINE
   Loaded on every page (index.html, products.html, product.html)
   Persists cart contents in localStorage so it survives full
   page navigations and even closing the browser.

   Cart item shape stored in localStorage:
   {
     key:        "harness-001::M"   (productId + '::' + size, or just productId if no size)
     productId:  "harness-001",
     size:       "M" | null,
     name:       "Classic Leather Harness",
     priceId:    "price_xxxxx",     ← Stripe Price ID for THIS size/variant
     unitPrice:  45.00,             ← for display only, in AUD
     image:      "img/Products/harness-001/1.jpeg",
     qty:        2
   }
   ════════════════════════════════════════════════════════════ */

(function () {
  const STORAGE_KEY = 'barkley_cart_v1';

  /* ── Core storage helpers ── */
  function readCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Cart storage error:', err);
    }
    renderCartUI();
    dispatchCartEvent();
  }

  function makeKey(productId, size) {
    return size ? `${productId}::${size}` : productId;
  }

  function dispatchCartEvent() {
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items: readCart() } }));
  }

  /* ── Public Cart API ── */
  const Cart = {
    /* Add an item. If same productId+size already in cart, stacks quantity. */
    add(productId, size, priceId, name, unitPrice, image, qty) {
      qty = Math.max(1, parseInt(qty, 10) || 1);
      const items = readCart();
      const key = makeKey(productId, size);
      const existing = items.find(i => i.key === key);

      if (existing) {
        existing.qty += qty;
      } else {
        items.push({
          key, productId, size: size || null,
          name, priceId,
          unitPrice: parseFloat(unitPrice) || 0,
          image: image || '',
          qty,
        });
      }
      writeCart(items);
      openDrawer();
    },

    remove(key) {
      const items = readCart().filter(i => i.key !== key);
      writeCart(items);
    },

    setQty(key, qty) {
      qty = parseInt(qty, 10);
      const items = readCart();
      const item = items.find(i => i.key === key);
      if (!item) return;
      if (qty <= 0) {
        return Cart.remove(key);
      }
      item.qty = qty;
      writeCart(items);
    },

    increment(key) {
      const items = readCart();
      const item = items.find(i => i.key === key);
      if (item) { item.qty += 1; writeCart(items); }
    },

    decrement(key) {
      const items = readCart();
      const item = items.find(i => i.key === key);
      if (!item) return;
      if (item.qty <= 1) return Cart.remove(key);
      item.qty -= 1;
      writeCart(items);
    },

    clear() {
      writeCart([]);
    },

    getAll() {
      return readCart();
    },

    getCount() {
      return readCart().reduce((sum, i) => sum + i.qty, 0);
    },

    getTotal() {
      return readCart().reduce((sum, i) => sum + (i.unitPrice * i.qty), 0);
    },
  };

  window.Cart = Cart;

  /* ════════════════════════════════════════════════════════════
     DRAWER UI — injected once per page, styled to match the
     existing mobile-drawer aesthetic (dark brown / gold accents)
     ════════════════════════════════════════════════════════════ */

  const DRAWER_CSS = `
    .cart-trigger {
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 38px; height: 38px; cursor: pointer; color: rgba(244,237,224,.85);
      transition: color .25s, transform .2s;
      background: none; border: none;
    }
    .cart-trigger:hover { color: var(--gold); transform: scale(1.06); }
    .cart-trigger svg { width: 21px; height: 21px; }
    .cart-badge {
      position: absolute; top: -4px; right: -6px;
      min-width: 16px; height: 16px; padding: 0 4px;
      background: var(--gold); color: var(--brown-dark);
      font-family: var(--sans); font-size: .58rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border-radius: 999px; line-height: 1;
      transform: scale(0); transition: transform .25s cubic-bezier(.34,1.56,.64,1);
    }
    .cart-badge.visible { transform: scale(1); }

    .cart-drawer {
      position: fixed; top: 0; right: -420px; width: min(420px, 100%); height: 100%;
      background: var(--cream); z-index: 1500; display: flex; flex-direction: column;
      box-shadow: -10px 0 40px rgba(0,0,0,.25);
      transition: right .4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .cart-drawer.open { right: 0; }
    .cart-drawer-overlay {
      position: fixed; inset: 0; background: rgba(20,10,4,.6); z-index: 1499;
      opacity: 0; pointer-events: none; transition: opacity .35s;
      backdrop-filter: blur(2px);
    }
    .cart-drawer-overlay.open { opacity: 1; pointer-events: all; }

    .cart-drawer-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 26px 28px 20px; border-bottom: 1px solid rgba(107,61,40,.12);
      flex-shrink: 0;
    }
    .cart-drawer-head h2 {
      font-family: var(--serif-body, serif); font-size: 1.3rem; font-weight: 500;
      color: var(--brown-dark);
    }
    .cart-drawer-close {
      background: none; border: none; cursor: pointer; font-size: 1.1rem;
      color: var(--brown); opacity: .6; transition: opacity .2s, transform .25s;
      padding: 4px;
    }
    .cart-drawer-close:hover { opacity: 1; transform: rotate(90deg); }

    .cart-drawer-body { flex: 1; overflow-y: auto; padding: 16px 22px; }
    .cart-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; text-align: center; color: #a08070; padding: 40px 20px;
    }
    .cart-empty p { font-size: .85rem; margin-top: 10px; max-width: 220px; }

    .cart-line {
      display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid rgba(107,61,40,.08);
    }
    .cart-line__img {
      width: 64px; height: 64px; flex-shrink: 0; background: var(--cream-dark, #e8dece);
      overflow: hidden;
    }
    .cart-line__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cart-line__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .cart-line__name {
      font-family: var(--serif-body, serif); font-size: .9rem; color: var(--brown-dark);
      line-height: 1.25;
    }
    .cart-line__size {
      font-family: var(--sans); font-size: .68rem; color: #a08070; letter-spacing: .04em;
    }
    .cart-line__bottom {
      display: flex; align-items: center; justify-content: space-between; margin-top: 4px;
    }
    .cart-qty {
      display: flex; align-items: center; gap: 0; border: 1px solid rgba(107,61,40,.2);
    }
    .cart-qty button {
      width: 24px; height: 24px; background: none; border: none; cursor: pointer;
      font-family: var(--sans); font-size: .8rem; color: var(--brown);
      display: flex; align-items: center; justify-content: center;
      transition: background .2s;
    }
    .cart-qty button:hover { background: rgba(107,61,40,.06); }
    .cart-qty span {
      font-family: var(--sans); font-size: .75rem; font-weight: 600; min-width: 22px;
      text-align: center; color: var(--brown-dark);
    }
    .cart-line__price {
      font-family: var(--serif-body, serif); font-size: .95rem; color: var(--brown-dark);
    }
    .cart-line__remove {
      background: none; border: none; cursor: pointer; color: #b09080;
      font-size: .72rem; letter-spacing: .06em; text-decoration: underline;
      padding: 0; transition: color .2s;
      font-family: var(--sans);
    }
    .cart-line__remove:hover { color: var(--sale-red, #c0392b); }

    .cart-drawer-foot {
      flex-shrink: 0; padding: 20px 28px 28px; border-top: 1px solid rgba(107,61,40,.12);
      background: var(--cream-warm, #efe5d0);
    }
    .cart-total-row {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-bottom: 16px;
    }
    .cart-total-row span:first-child {
      font-family: var(--sans); font-size: .68rem; font-weight: 600;
      letter-spacing: .16em; text-transform: uppercase; color: var(--brown);
    }
    .cart-total-row span:last-child {
      font-family: var(--serif-body, serif); font-size: 1.5rem; color: var(--brown-dark);
    }
    .cart-checkout-btn {
      width: 100%; padding: 15px; background: var(--brown-dark); color: var(--gold);
      font-family: var(--sans); font-size: .72rem; font-weight: 700;
      letter-spacing: .18em; text-transform: uppercase; border: none; cursor: pointer;
      position: relative; overflow: hidden; transition: color .3s, transform .2s, box-shadow .2s;
    }
    .cart-checkout-btn::before {
      content: ''; position: absolute; inset: 0; background: var(--gold);
      transform: translateX(-101%); transition: transform .35s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .cart-checkout-btn:hover::before { transform: translateX(0); }
    .cart-checkout-btn:hover { color: var(--brown-dark); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(247,217,84,.25); }
    .cart-checkout-btn span { position: relative; z-index: 1; }
    .cart-checkout-btn:disabled { opacity: .5; pointer-events: none; }
    .cart-shipping-note {
      text-align: center; font-size: .68rem; color: #a08070; margin-top: 10px;
      font-family: var(--sans);
    }

    @media (max-width: 600px) {
      .cart-drawer { width: 100%; right: -100%; }
    }
  `;

  const CART_ICON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="19" cy="21" r="1"></circle>
      <path d="M2.5 2.5h2l2.6 13.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 7H5.2"></path>
    </svg>`;

  function injectStyles() {
    if (document.getElementById('cart-engine-styles')) return;
    const style = document.createElement('style');
    style.id = 'cart-engine-styles';
    style.textContent = DRAWER_CSS;
    document.head.appendChild(style);
  }

  function injectMarkup() {
    if (document.getElementById('cartDrawer')) return;

    const overlay = document.createElement('div');
    overlay.className = 'cart-drawer-overlay';
    overlay.id = 'cartDrawerOverlay';

    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.id = 'cartDrawer';
    drawer.innerHTML = `
      <div class="cart-drawer-head">
        <h2>Your Cart</h2>
        <button class="cart-drawer-close" id="cartDrawerClose">&#x2715;</button>
      </div>
      <div class="cart-drawer-body" id="cartDrawerBody"></div>
      <div class="cart-drawer-foot" id="cartDrawerFoot">
        <div class="cart-total-row">
          <span>Subtotal</span>
          <span id="cartTotalDisplay">$0.00</span>
        </div>
        <button class="cart-checkout-btn" id="cartCheckoutBtn"><span>Checkout — Secure Payment</span></button>
        <p class="cart-shipping-note">Shipping & taxes calculated at checkout</p>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.addEventListener('click', closeDrawer);
    document.getElementById('cartDrawerClose').addEventListener('click', closeDrawer);
    document.getElementById('cartCheckoutBtn').addEventListener('click', startCartCheckout);
  }

  function injectTriggerIntoNavbar() {
    // Try common nav containers used across the site's pages
    const navInner = document.querySelector('.nav-inner');
    if (!navInner || document.getElementById('cartTriggerBtn')) return;

    const btn = document.createElement('button');
    btn.className = 'cart-trigger';
    btn.id = 'cartTriggerBtn';
    btn.setAttribute('aria-label', 'Open cart');
    btn.innerHTML = `${CART_ICON_SVG}<span class="cart-badge" id="cartBadge">0</span>`;
    btn.addEventListener('click', openDrawer);

    // Insert right before the hamburger button if present, else append
    const hamburger = navInner.querySelector('.hamburger');
    if (hamburger) {
      navInner.insertBefore(btn, hamburger);
    } else {
      navInner.appendChild(btn);
    }
  }

  function openDrawer() {
    document.getElementById('cartDrawer')?.classList.add('open');
    document.getElementById('cartDrawerOverlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    document.getElementById('cartDrawer')?.classList.remove('open');
    document.getElementById('cartDrawerOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }
  window.openCartDrawer = openDrawer;
  window.closeCartDrawer = closeDrawer;

  function renderCartUI() {
    const items = readCart();
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + (i.unitPrice * i.qty), 0);

    // Badge
    const badge = document.getElementById('cartBadge');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('visible', count > 0);
    }

    // Drawer body
    const body = document.getElementById('cartDrawerBody');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (!body) return;

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          ${CART_ICON_SVG.replace('width="24" height="24"', 'width="40" height="40"').replace('stroke-width="1.6"', 'stroke-width="1.2"')}
          <p>Your cart is empty. Browse our collection to find something for your dog.</p>
        </div>`;
      if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
      body.innerHTML = items.map(item => `
        <div class="cart-line" data-key="${item.key}">
          <div class="cart-line__img">
            <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'" />
          </div>
          <div class="cart-line__body">
            <div class="cart-line__name">${item.name}</div>
            ${item.size ? `<div class="cart-line__size">Size: ${item.size}</div>` : ''}
            <div class="cart-line__bottom">
              <div class="cart-qty">
                <button onclick="Cart.decrement('${item.key}')">−</button>
                <span>${item.qty}</span>
                <button onclick="Cart.increment('${item.key}')">+</button>
              </div>
              <span class="cart-line__price">$${(item.unitPrice * item.qty).toFixed(2)}</span>
            </div>
            <button class="cart-line__remove" onclick="Cart.remove('${item.key}')">Remove</button>
          </div>
        </div>`).join('');
      if (checkoutBtn) checkoutBtn.disabled = false;
    }

    const totalDisplay = document.getElementById('cartTotalDisplay');
    if (totalDisplay) totalDisplay.textContent = `$${total.toFixed(2)}`;
  }

  /* ════════════════════════════════════════════════════════════
     CHECKOUT — sends the whole cart to the backend in one go
     ════════════════════════════════════════════════════════════ */
  async function startCartCheckout() {
    const items = readCart();
    if (items.length === 0) return;

    // Hardcode your specific Apps Script URL as the ultimate fallback so it works on every page
    const fallbackUrl = 'https://script.google.com/macros/s/AKfycbzGoLOLPBhfDMArjE4vfIidbmVWpI1Tzp6nUTl6Y5LIFobn3ai0PqIo4GGyeJ_suwqYbw/exec';
    const backendUrl = window.CART_BACKEND_URL || (window.CONFIG && window.CONFIG.BACKEND_URL) || fallbackUrl;

    if (!backendUrl) {
      console.error('No backend URL configured for checkout.');
      alert('Checkout is not configured on this page yet.');
      return;
    }

    const btn = document.getElementById('cartCheckoutBtn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Redirecting…</span>';

    try {
      const baseUrl = window.location.protocol + '//' + window.location.host;
      const response = await fetch(backendUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'createCheckoutSession',
          items: items.map(i => ({ priceId: i.priceId, quantity: i.qty })),
          successUrl: baseUrl + '/success.html?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.href,
        }),
      });
      const data = JSON.parse(await response.text());
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Could not create checkout session');
      }
    } catch (err) {
      console.error('Cart checkout error:', err);
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      alert('Something went wrong starting checkout. Please try again.\n\n' + err.message);
    }
  }

/* ── Init on DOM ready ── */
  function init() {
    injectStyles();
    injectMarkup();
    
    // Attempt to inject immediately
    injectTriggerIntoNavbar();
    renderCartUI();

    // Safety net: If the navbar wasn't ready, set an observer to wait for it
    if (!document.getElementById('cartTriggerBtn')) {
      const observer = new MutationObserver((mutations, obs) => {
        const navInner = document.querySelector('.nav-inner');
        if (navInner) {
          injectTriggerIntoNavbar();
          obs.disconnect(); // Stop watching once we find it
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Ensure init runs regardless of when the script loads relative to the DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // If we missed DOMContentLoaded, run immediately
    init();
  }
})();