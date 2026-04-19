/* ============================================================
   BARKLEY PET — PRODUCTS SCRIPT (products.js)
   Handles: loading products from Google Sheets API,
            rendering product cards, filtering
   ============================================================ */

// ── STEP 1: Replace this URL with your deployed Google Apps Script URL ──
// See README section "Google Sheets Backend" for full setup instructions
const API_BASE_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

// ── STEP 2: Map each product ID to its Stripe payment link ──
// Create products in your Stripe dashboard, copy the payment link URLs here
const STRIPE_LINKS = {
  // Format: 'product_id': 'https://buy.stripe.com/your_link'
  'collar-001':   'https://buy.stripe.com/REPLACE_WITH_YOUR_LINK',
  'harness-001':  'https://buy.stripe.com/REPLACE_WITH_YOUR_LINK',
  'leash-001':    'https://buy.stripe.com/REPLACE_WITH_YOUR_LINK',
  'bundle-001':   'https://buy.stripe.com/REPLACE_WITH_YOUR_LINK',
  'bundle-002':   'https://buy.stripe.com/REPLACE_WITH_YOUR_LINK',
};

// ── Track current filter so we can re-filter client-side ──
let allProducts = [];
let currentFilter = 'all';

/* ============================================================
   INIT — called when products page DOM is ready
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Only run on the products page
  if (!document.querySelector('.all-products-grid')) return;

  loadProducts();
  initFilters();
});

/* ============================================================
   LOAD PRODUCTS from Google Sheets via Apps Script API
   Shows skeleton cards while loading, then renders real cards
   ============================================================ */
async function loadProducts() {
  const grid = document.querySelector('.all-products-grid');
  if (!grid) return;

  // Show 6 skeleton placeholder cards while data loads
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton skeleton-card"></div>
  `).join('');

  try {
    // Fetch products from your Apps Script API
    const response = await fetch(`${API_BASE_URL}?action=getProducts`);

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    allProducts = data.products || [];

    // Render the products
    renderProducts(allProducts);

  } catch (error) {
    // If API fails, show fallback demo products so the page still works
    console.warn('API unavailable, using demo data:', error);
    allProducts = getDemoProducts();
    renderProducts(allProducts);
  }
}

/* ============================================================
   RENDER PRODUCTS — creates HTML cards from product data
   ============================================================ */
function renderProducts(products) {
  const grid = document.querySelector('.all-products-grid');
  if (!grid) return;

  // Filter by current category
  const filtered = currentFilter === 'all'
    ? products
    : products.filter(p => p.pet_type?.toLowerCase() === currentFilter ||
                            p.category?.toLowerCase() === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 80px 0; color: var(--grey);">
        <p style="font-size:1.1rem;">No products found in this category.</p>
      </div>`;
    return;
  }

  // Build and insert the product cards
  grid.innerHTML = filtered.map((product, index) => `
    <div class="product-card" data-animate data-animate-delay="${(index % 3) + 1}">
      <div class="product-card__image-wrap">
        <img
          src="${product.image_url || getPlaceholderImage(product.name)}"
          alt="${product.name}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=70'"
        />
        <span class="product-card__tag">${getCategoryLabel(product)}</span>
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__desc">${product.description || ''}</p>
        <div class="product-card__footer">
          <span class="product-card__price">$${parseFloat(product.price).toFixed(2)}</span>
          <a
            href="${STRIPE_LINKS[product.id] || '#'}"
            class="product-card__buy"
            onclick="handleBuyClick(event, '${product.id}', '${product.name}')"
          >Buy Now →</a>
        </div>
      </div>
    </div>
  `).join('');

  // Re-run scroll animations for new cards
  initScrollAnimations();
}

/* ============================================================
   HANDLE BUY CLICK
   If Stripe link is configured, go to Stripe checkout.
   If not yet configured, show an alert with instructions.
   ============================================================ */
function handleBuyClick(event, productId, productName) {
  const stripeLink = STRIPE_LINKS[productId];

  if (!stripeLink || stripeLink.includes('REPLACE_WITH_YOUR_LINK')) {
    event.preventDefault();
    alert(`SETUP REQUIRED:\n\nTo enable purchases for "${productName}":\n1. Create a product in your Stripe dashboard\n2. Copy the payment link\n3. Add it to the STRIPE_LINKS object in products.js`);
    return;
  }

  // Stripe link is valid — allow the default navigation to Stripe
  // You can add analytics tracking here if needed
  console.log(`Redirecting to Stripe for: ${productName}`);
}

/* ============================================================
   PRODUCT FILTERING
   Adds click handlers to filter buttons
   ============================================================ */
function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update filter and re-render
      currentFilter = btn.dataset.filter || 'all';
      renderProducts(allProducts);
    });
  });
}

/* ============================================================
   HELPERS
   ============================================================ */

// Returns a sensible category label for product cards
function getCategoryLabel(product) {
  const name = (product.name || '').toLowerCase();
  if (name.includes('bundle') || name.includes('package')) return 'Bundle';
  if (name.includes('collar')) return 'Collar';
  if (name.includes('harness')) return 'Harness';
  if (name.includes('leash')) return 'Leash';
  return product.pet_type || 'Accessories';
}

// Returns a relevant Unsplash photo based on product name
function getPlaceholderImage(name) {
  const lc = (name || '').toLowerCase();
  if (lc.includes('collar'))  return 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&q=70';
  if (lc.includes('harness')) return 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=70';
  if (lc.includes('leash'))   return 'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=600&q=70';
  return 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=70';
}

// Re-run IntersectionObserver after dynamic render
function initScrollAnimations() {
  const targets = document.querySelectorAll('[data-animate]:not(.visible)');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  targets.forEach(el => observer.observe(el));
}

/* ============================================================
   DEMO PRODUCTS
   Used as fallback when API is not yet connected.
   Replace with real data from your Google Sheet.
   ============================================================ */
function getDemoProducts() {
  return [
    {
      id: 'collar-001',
      name: 'Heritage Leather Collar',
      description: 'Full-grain vegetable-tanned leather. Brass hardware. Available in 4 sizes.',
      price: '79.00',
      pet_type: 'collar',
      image_url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&q=70'
    },
    {
      id: 'collar-002',
      name: 'Classic Canvas Collar',
      description: 'Durable woven canvas with gold-tone buckle. Lightweight and everyday ready.',
      price: '39.00',
      pet_type: 'collar',
      image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=70'
    },
    {
      id: 'harness-001',
      name: 'Premier Leather Harness',
      description: 'Step-in design with padded chest piece. Buttery soft premium leather.',
      price: '129.00',
      pet_type: 'harness',
      image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=70'
    },
    {
      id: 'harness-002',
      name: 'Everyday Harness',
      description: 'Comfortable nylon harness with quick-release buckle. Perfect for active dogs.',
      price: '59.00',
      pet_type: 'harness',
      image_url: 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&q=70'
    },
    {
      id: 'leash-001',
      name: 'Braided Leather Lead',
      description: 'Hand-braided 1.2m leather leash. Solid brass clip. Develops a beautiful patina.',
      price: '89.00',
      pet_type: 'leash',
      image_url: 'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=600&q=70'
    },
    {
      id: 'leash-002',
      name: 'Standard Leash',
      description: 'Reliable everyday leash in heavy-duty nylon. 1.5m length, swivel clip.',
      price: '34.00',
      pet_type: 'leash',
      image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=70'
    },
    {
      id: 'bundle-001',
      name: 'Starter Bundle',
      description: 'Canvas Collar + Everyday Harness + Standard Leash. Perfect first set.',
      price: '119.00',
      pet_type: 'bundle',
      image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=70'
    },
    {
      id: 'bundle-002',
      name: 'Premium Leather Bundle',
      description: 'Heritage Collar + Premier Harness + Braided Lead. The complete luxury set.',
      price: '279.00',
      pet_type: 'bundle',
      image_url: 'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=600&q=70'
    }
  ];
}