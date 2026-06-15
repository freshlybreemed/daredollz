/* ============================================
   DARE DOLLZ — Email capture / 10% off modal
   Front-end only: stores emails in localStorage.
   Wire to a real ESP (Klaviyo/Mailchimp/Shopify) later.
============================================ */
(function () {
  const overlay = document.getElementById('promo-overlay');
  if (!overlay) return;

  const SEEN_KEY = 'dd_promo_seen';
  const LIST_KEY = 'dd_emails';
  const form = document.getElementById('promo-form');
  const success = document.getElementById('promo-success');
  const closeBtn = document.getElementById('promo-close');

  function open() { overlay.classList.add('open'); }
  function close() {
    overlay.classList.remove('open');
    localStorage.setItem(SEEN_KEY, '1');
  }

  // Show once, a few seconds after landing on the page
  if (!localStorage.getItem(SEEN_KEY)) {
    setTimeout(open, 4000);
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('promo-email').value.trim();
    if (!email) return;

    // Persist locally (placeholder for a real email service)
    try {
      const list = JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
      list.push({ email: email, at: Date.now() });
      localStorage.setItem(LIST_KEY, JSON.stringify(list));
    } catch (err) { /* ignore storage errors */ }

    form.hidden = true;
    success.hidden = false;
    localStorage.setItem(SEEN_KEY, '1');
  });
})();
