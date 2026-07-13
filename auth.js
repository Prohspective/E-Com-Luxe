/* ==========================================================================
   LUXE EN VOGUE — Auth
   Handles: nav sign-in/account state, sign up form, sign in form,
   "Continue with Google" buttons, sign out.
   Session is a cookie set by the /api/auth-* endpoints — this file
   just calls them and reflects the result in the UI.
   ========================================================================== */

/* ---------------- Nav auth slot (shared across every page) ---------------- */
async function initAuthNav() {
  const slot = document.querySelector('[data-auth-nav]');
  const mobileLink = document.querySelector('[data-mobile-auth-link]');
  if (!slot && !mobileLink) return;

  let user = null;
  try {
    const res = await fetch('/api/auth-session');
    if (res.ok) {
      const data = await res.json();
      user = data.user;
    }
  } catch (e) {
    // Network hiccup — fail soft, nav just shows "Sign in".
  }

  if (user) {
    if (slot) {
      slot.innerHTML = `
        <div class="nav-auth-user">
          <span class="nav-auth-name">${user.name.split(' ')[0]}</span>
          <button type="button" class="nav-auth-signout" data-signout-btn>Sign out</button>
        </div>`;
      slot.querySelector('[data-signout-btn]').addEventListener('click', signOut);
    }
    if (mobileLink) {
      mobileLink.textContent = 'Sign out';
      mobileLink.setAttribute('href', '#');
      mobileLink.addEventListener('click', (e) => { e.preventDefault(); signOut(); });
    }
  }
  // If no user, the static "Sign in" markup already in the HTML is correct — leave it.
}

async function signOut() {
  try {
    await fetch('/api/auth-logout', { method: 'POST' });
  } catch (e) {
    // Even if the request fails, send the user back to a logged-out view.
  }
  window.location.href = 'index.html';
}

/* ---------------- "Continue with Google" buttons ---------------- */
function initGoogleButtons() {
  document.querySelectorAll('[data-google-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.href = '/api/auth-google';
    });
  });
}

/* ---------------- Show ?error= from a redirect (e.g. failed Google sign-in) ---------------- */
function showRedirectError() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (!error) return;
  const target = document.querySelector('[data-signin-server-error]');
  if (target) target.textContent = error;
}

/* ---------------- Sign up form ---------------- */
function initSignupForm() {
  const form = document.querySelector('[data-signup-form]');
  if (!form) return;

  const errorEl = form.querySelector('[data-signup-error]');
  const submitBtn = form.querySelector('[data-signup-submit]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const name = form.querySelector('[data-signup-name]').value.trim();
    const email = form.querySelector('[data-signup-email]').value.trim();
    const password = form.querySelector('[data-signup-password]').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      const res = await fetch('/api/auth-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || 'Something went wrong. Please try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account';
        return;
      }

      window.location.href = 'index.html';
    } catch (err) {
      errorEl.textContent = 'Network error — please check your connection and try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
}

/* ---------------- Sign in form ---------------- */
function initSigninForm() {
  const form = document.querySelector('[data-signin-form]');
  if (!form) return;

  const errorEl = form.querySelector('[data-signin-error]');
  const submitBtn = form.querySelector('[data-signin-submit]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const email = form.querySelector('[data-signin-email]').value.trim();
    const password = form.querySelector('[data-signin-password]').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const res = await fetch('/api/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || 'Something went wrong. Please try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
        return;
      }

      window.location.href = 'index.html';
    } catch (err) {
      errorEl.textContent = 'Network error — please check your connection and try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthNav();
  initGoogleButtons();
  initSignupForm();
  initSigninForm();
  showRedirectError();
});