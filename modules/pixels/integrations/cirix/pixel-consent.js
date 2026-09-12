/* Consent and measurement adapter for the static Cirix agency website. */
(() => {
    const config = window.CIRIX_PIXEL_CONFIG;
    if (!config || !/^[0-9a-f-]{36}$/i.test(config.siteId || "")) return;
    let endpoint;
    try {
        endpoint = new URL(config.endpoint);
        if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) return;
    } catch { return; }

    const preferenceKey = 'cirix:measurement-consent:v1';
    const blocked = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
    let choice = { analytics: false, marketing: false, version: '1' };
    let hasChoice = false;
    let scriptLoading = false;
    try {
        const stored = JSON.parse(localStorage.getItem(preferenceKey) || 'null');
        if (stored && stored.expires > Date.now() && stored.version === '1') {
            choice = { analytics: stored.analytics === true, marketing: stored.marketing === true, version: '1' };
            hasChoice = true;
        }
    } catch { /* The banner works without persistent storage. */ }

    const style = document.createElement('style');
    style.textContent = `.cirix-consent{position:fixed;bottom:20px;left:20px;right:20px;max-width:650px;z-index:10000;background:#0a244a;color:#fff;border:1px solid #1c3d67;border-radius:16px;padding:24px;font:14px/1.6 Inter,system-ui,sans-serif;box-shadow:0 8px 32px #05193466}.cirix-consent[hidden]{display:none}.cirix-consent h2{font:600 22px Outfit,system-ui,sans-serif;margin:0 0 8px}.cirix-consent p{margin:0 0 16px;color:#d3d8df}.cirix-consent-actions{display:flex;gap:8px;flex-wrap:wrap}.cirix-consent button,.cirix-privacy-button{min-height:44px;padding:10px 14px;color:#fff;background:#16498f;border:1px solid #5688cd;border-radius:8px;cursor:pointer;font:inherit}.cirix-consent button:focus-visible,.cirix-privacy-button:focus-visible{outline:2px solid #ff647f;outline-offset:3px}.cirix-privacy-button{margin:16px}.cirix-consent button:disabled{opacity:.55;cursor:not-allowed}@media(max-width:500px){.cirix-consent{bottom:12px;left:12px;right:12px;padding:16px}}`;
    document.head.appendChild(style);
    const banner = document.createElement('section');
    banner.className = 'cirix-consent';
    banner.setAttribute('aria-label', 'Privacy preferences');
    banner.innerHTML = '<h2>Your privacy, your choice</h2><p>Allow us to measure page visits and successful enquiries using random browser identifiers. Advertising permission also allows campaign click identifiers to be stored. Measurement data is retained for up to 90 days. You can change your choice at any time using Privacy preferences.</p><div class="cirix-consent-actions"><button type="button" data-choice="reject">Reject optional</button><button type="button" data-choice="analytics">Analytics only</button><button type="button" data-choice="all">Analytics + advertising</button></div>';
    const preferences = document.createElement('button');
    preferences.type = 'button';
    preferences.className = 'cirix-privacy-button';
    preferences.textContent = 'Privacy preferences';
    const footer = document.querySelector('footer') || document.body;
    footer.appendChild(preferences);
    document.body.appendChild(banner);
    banner.hidden = hasChoice;
    preferences.addEventListener('click', () => {
        banner.hidden = false;
        banner.querySelector('button').focus();
    });
    if (blocked()) {
        choice = { analytics: false, marketing: false, version: '1' };
        banner.querySelector('p').textContent = 'Your browser privacy preference disables optional measurement on this website. No visit or advertising events will be sent by this tool.';
        banner.querySelector('[data-choice="analytics"]').disabled = true;
        banner.querySelector('[data-choice="all"]').disabled = true;
    }

    function applyChoice() {
        if (window.cirixPixel) { window.cirixPixel.consent(choice); return; }
        if (!choice.analytics || blocked() || scriptLoading) return;
        scriptLoading = true;
        const script = document.createElement('script');
        script.src = new URL('/pixel.js', endpoint).href;
        script.setAttribute('data-site', config.siteId);
        script.async = true;
        script.onerror = () => { scriptLoading = false; };
        document.head.appendChild(script);
    }
    window.addEventListener('cirix:ready', () => window.cirixPixel.consent(choice));
    banner.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => {
        const value = button.getAttribute('data-choice');
        choice = { analytics: !blocked() && value !== 'reject', marketing: !blocked() && value === 'all', version: '1' };
        try { localStorage.setItem(preferenceKey, JSON.stringify({ ...choice, expires: Date.now() + 90 * 86400000 })); } catch { /* Memory-only choice. */ }
        banner.hidden = true;
        applyChoice();
        preferences.focus();
    }));
    document.addEventListener('click', (event) => {
        const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (!anchor) return;
        const href = anchor.getAttribute('href') || '';
        if (/^(tel:|mailto:|https:\/\/(wa\.me\/|api\.whatsapp\.com\/))/.test(href)) {
            window.cirixPixel?.track('contact');
        }
    });
    applyChoice();
})();
