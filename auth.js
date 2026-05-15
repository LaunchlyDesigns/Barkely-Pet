/* ============================================================
   BARKLEY PET — AUTH SCRIPT (auth.js)
   Handles: Google Sign-In, session management, account page
   ============================================================ */

// ── STEP 1: Replace with your Google OAuth Client ID ──
// Get this from Google Cloud Console → APIs & Services → Credentials
// See README section "Google Sign-In Setup" for full instructions
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// ── Your Google Apps Script API URL (same as in products.js) ──
const AUTH_API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

/* ============================================================
   INIT — runs on every page load
   Checks if user is already signed in and updates the UI
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  initGoogleSignIn();
  updateNavAuthState();

  // If on the account page, load account details
  if (document.querySelector('.account-section')) {
    loadAccountPage();
  }

});

/* ============================================================
   GOOGLE SIGN-IN SETUP
   Uses Google Identity Services (GIS) library
   The library is loaded in the HTML <head> tag
   ============================================================ */
function initGoogleSignIn() {
  // The google object is provided by the Google Identity Services script
  // loaded in your HTML: <script src="https://accounts.google.com/gsi/client">
  if (typeof google === 'undefined') {
    console.warn('Google Identity Services not loaded yet.');
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,   // Your OAuth client ID
    callback: handleSignInResponse, // Function called when user signs in
    auto_select: false,             // Don't auto sign-in returning users
    cancel_on_tap_outside: true,    // Close popup if user clicks away
  });

  // If there's a sign-in button container on the page, render the button
  const btnContainer = document.getElementById('google-signin-btn');
  if (btnContainer) {
    google.accounts.id.renderButton(btnContainer, {
      theme: 'filled_black',  // Matches our dark brand
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 280
    });
  }
}

/* ============================================================
   HANDLE SIGN-IN RESPONSE
   Called by Google with a JWT credential token after sign-in
   ============================================================ */
async function handleSignInResponse(response) {
  // The response.credential is a JWT token
  // We decode it to get the user's basic info
  const user = decodeJWT(response.credential);

  if (!user) {
    showAuthError('Sign-in failed. Please try again.');
    return;
  }

  // Save the raw JWT token for API calls
  sessionStorage.setItem('barkley_token', response.credential);

  // Save basic user info to sessionStorage
  // sessionStorage clears when the browser tab closes (more secure than localStorage)
  sessionStorage.setItem('barkley_user', JSON.stringify({
    id:      user.sub,     // Google's unique user ID
    email:   user.email,
    name:    user.name,
    picture: user.picture
  }));

  // Now fetch this customer's data from Google Sheets
  await fetchCustomerData(user.email);

  // Update the navbar to show user is signed in
  updateNavAuthState();

  // If on account page, load the account details
  if (document.querySelector('.account-section')) {
    loadAccountPage();
  }
}

/* ============================================================
   FETCH CUSTOMER DATA from Google Sheets
   Looks up the customer record using their email address
   ============================================================ */
async function fetchCustomerData(email) {
  try {
    const response = await fetch(
      `${AUTH_API_URL}?action=getCustomer&email=${encodeURIComponent(email)}`
    );

    if (!response.ok) throw new Error('Failed to fetch customer data');

    const data = await response.json();

    if (data.customer) {
      // Save the customer's subscription/plan data
      sessionStorage.setItem('barkley_customer', JSON.stringify(data.customer));
    }

  } catch (error) {
    console.warn('Could not fetch customer data:', error);
    // The user is still signed in, just no subscription data loaded
  }
}

/* ============================================================
   SIGN OUT
   Clears all stored user data and refreshes the page
   ============================================================ */
function signOut() {
  // Clear all stored session data
  sessionStorage.removeItem('barkley_user');
  sessionStorage.removeItem('barkley_token');
  sessionStorage.removeItem('barkley_customer');

  // Tell Google to sign out too
  if (typeof google !== 'undefined') {
    google.accounts.id.disableAutoSelect();
  }

  // Refresh the page to reset UI
  window.location.reload();
}

/* ============================================================
   UPDATE NAVBAR AUTH STATE
   Shows "Account" link if signed in, or "Sign In" if not
   ============================================================ */
function updateNavAuthState() {
  const user = getCurrentUser();
  const authLinks = document.querySelectorAll('.nav-auth-link');

  authLinks.forEach(el => {
    if (user) {
      el.innerHTML = `<a href="account.html">My Account</a>`;
    } else {
      el.innerHTML = `<a href="account.html">Sign In</a>`;
    }
  });
}

/* ============================================================
   LOAD ACCOUNT PAGE
   Populates the account page with user + subscription data
   ============================================================ */
function loadAccountPage() {
  const user     = getCurrentUser();
  const customer = getCurrentCustomer();
  const content  = document.getElementById('account-content');

  if (!content) return;

  if (!user) {
    // User not signed in — show sign-in prompt
    content.innerHTML = `
      <div class="signin-prompt">
        <span class="eyebrow">My Account</span>
        <h3>Sign in to view your account</h3>
        <p>Access your order history, subscription status and more.</p>
        <div id="google-signin-btn"></div>
      </div>
    `;
    // Render Google sign-in button inside the prompt
    setTimeout(initGoogleSignIn, 100);
    return;
  }

  // User is signed in — show their account details
  content.innerHTML = `
    <div class="account-card" data-animate>
      <span class="eyebrow">Welcome back</span>
      <h2>${user.name}</h2>

      <div class="account-field">
        <label>Email</label>
        <span>${user.email}</span>
      </div>

      <div class="account-field">
        <label>Plan</label>
        <span>${customer?.plan || 'No active plan'}</span>
      </div>

      <div class="account-field">
        <label>Status</label>
        <span>
          <span class="status-badge ${customer?.status === 'active' ? 'status-badge--active' : 'status-badge--inactive'}">
            ${customer?.status || 'Inactive'}
          </span>
        </span>
      </div>

      ${customer?.start_date ? `
      <div class="account-field">
        <label>Member Since</label>
        <span>${formatDate(customer.start_date)}</span>
      </div>
      ` : ''}

      <div style="margin-top: 36px; display: flex; gap: 14px; flex-wrap: wrap;">
        <a href="products.html" class="btn btn--gold">Shop Products</a>
        <button onclick="signOut()" class="btn btn--outline">Sign Out</button>
      </div>
    </div>
  `;
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

// Get current user from sessionStorage
function getCurrentUser() {
  const stored = sessionStorage.getItem('barkley_user');
  return stored ? JSON.parse(stored) : null;
}

// Get current customer subscription data from sessionStorage
function getCurrentCustomer() {
  const stored = sessionStorage.getItem('barkley_customer');
  return stored ? JSON.parse(stored) : null;
}

// Decode a Google JWT token to get user info
// Note: This does NOT verify the signature — that happens server-side
// For a production app, verify the token in your Apps Script
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload   = decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// Format a date string nicely
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

// Show an error message on auth-related pages
function showAuthError(message) {
  const existing = document.querySelector('.auth-error');
  if (existing) existing.remove();

  const err = document.createElement('p');
  err.className = 'auth-error';
  err.style.cssText = 'color: #c0392b; font-size: 0.85rem; margin-top: 12px;';
  err.textContent = message;

  const btn = document.getElementById('google-signin-btn');
  if (btn) btn.after(err);
}