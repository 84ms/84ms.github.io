(function () {
    'use strict';

    // Note on URLs: nav links and canonical use the slashless form
    // (e.g. /synopsis). GitHub Pages serves the file from /synopsis/index.html
    // and 301-redirects /synopsis → /synopsis/, so the address bar shows the
    // slashed form after navigation. We don't strip the slash on the client —
    // mixing a server 301 with a client-side history.replaceState is fragile
    // (race conditions with bfcache, prefetchers, archival fetchers reading
    // the displayed URL), and the displayed URL is a cosmetic concern only:
    // typed / shared / canonical URLs without the slash already resolve fine.

    // ---------- Mobile nav toggle ----------
    var toggle = document.getElementById('nav-toggle');
    var nav = document.querySelector('.primary-nav');
    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            var open = nav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        nav.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') {
                nav.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ---------- Language dropdown ----------
    // The <details> opens/closes natively; this only closes it on an outside
    // click or Escape, which native <details> does not do on its own. Pure
    // enhancement — the anchors inside navigate with or without this.
    var langSwitcher = document.querySelector('.lang-switcher');
    if (langSwitcher) {
        document.addEventListener('click', function (e) {
            if (langSwitcher.hasAttribute('open') && !langSwitcher.contains(e.target)) {
                langSwitcher.removeAttribute('open');
            }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && langSwitcher.hasAttribute('open')) {
                langSwitcher.removeAttribute('open');
                var summary = langSwitcher.querySelector('summary');
                if (summary) summary.focus();
            }
        });
    }

    // ---------- Analytics helpers ----------
    // Safe wrappers: never throw if the loader isn't present (ad-blocker, dev mode).
    function ga(eventName, params) {
        if (typeof window.gtag === 'function') {
            try { window.gtag('event', eventName, params || {}); } catch (_) { /* swallow */ }
        }
    }
    // Meta Pixel — only standard events are used so they show up in Events
    // Manager / Ads Manager without manual setup. Valid names:
    // ViewContent, Lead, AddToCart, InitiateCheckout, Purchase, etc.
    function fb(eventName, params) {
        if (typeof window.fbq === 'function') {
            try { window.fbq('track', eventName, params || {}); } catch (_) { /* swallow */ }
        }
    }

    function classify(el, href) {
        if (el.classList.contains('lang-toggle')) return 'lang_toggle';
        if (el.classList.contains('btn-primary')) return 'btn_primary';
        if (el.classList.contains('btn-secondary')) return 'btn_secondary';
        if (el.classList.contains('btn-ghost')) return 'btn_ghost';
        if (el.classList.contains('btn')) return 'btn';
        if (href && href.indexOf('mailto:') === 0) return 'mailto';
        return 'link';
    }

    function amazonProduct(href) {
        // Map Amazon ASINs to product names so reports group correctly.
        if (/B0H8HM323Z/i.test(href)) return 'paperback';
        if (/B0H8SB7NVT/i.test(href)) return 'hardcover';
        return 'amazon';
    }

    function newTxnId(product) {
        // GA4 deduplicates `purchase` events that share a transaction_id, so
        // every click gets a fresh one. Format: amz-<product>-<ms>-<rand>.
        return 'amz-' + product + '-' + Date.now() + '-'
            + Math.random().toString(36).slice(2, 8);
    }

    // ---------- CTA click tracking ----------
    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest
            ? e.target.closest('.btn, .lang-toggle')
            : null;
        if (!el) return;

        var href = el.getAttribute('href') || '';
        var label = (el.textContent || '').trim().replace(/\s+/g, ' ');
        var category = classify(el, href);
        var isAmazon = /(^|\/\/)([a-z0-9-]+\.)*amazon\.[a-z.]+/i.test(href);
        var isEpub = /\.epub(\?|$)/i.test(href);
        var pagePath = window.location.pathname + window.location.search;

        var ctaKind = isAmazon ? 'amazon'
            : isEpub ? 'epub_download'
            : el.classList.contains('lang-toggle') ? 'lang_toggle'
            : href.indexOf('/sample') >= 0 ? 'read_sample'
            : 'other';

        // Generic CTA-click event — useful for funnel + comparison reports.
        ga('cta_click', {
            cta_label: label,
            cta_category: category,
            cta_destination: href,
            cta_external: isAmazon || /^https?:\/\//i.test(href)
                && href.indexOf(window.location.origin) !== 0,
            cta_kind: ctaKind,
            page_path: pagePath
        });

        // "Read sample" → standard `ViewContent` so it shows up as content engagement.
        if (ctaKind === 'read_sample') {
            fb('ViewContent', {
                content_name: 'Sample chapters',
                content_category: 'sample',
                content_type: 'article'
            });
        }

        if (isEpub) {
            ga('file_download', {
                link_url: href,
                file_extension: 'epub',
                file_name: href.split('/').pop(),
                link_text: label
            });
            // EPUB sample download → standard events: AddToCart (taking the
            // sample) AND ViewContent (engaging with the content). Both are
            // standard Pixel events that map cleanly in Ads Manager.
            fb('AddToCart', {
                content_name: 'EPUB sample',
                content_ids: [href.split('/').pop()],
                content_type: 'product',
                content_category: 'sample_download',
                value: 0,
                currency: 'USD'
            });
            fb('ViewContent', {
                content_name: 'EPUB sample',
                content_category: 'sample_download',
                content_type: 'product'
            });
        }

        // Amazon outbound → $1 purchase event (proxy conversion).
        if (isAmazon) {
            var product = amazonProduct(href);
            ga('purchase', {
                transaction_id: newTxnId(product),
                value: 1.00,
                currency: 'USD',
                affiliation: 'Amazon',
                items: [{
                    item_id: 'amz-' + product,
                    item_name: '84ms — ' + product,
                    item_brand: '84 мілісекунди',
                    item_category: 'amazon-click',
                    price: 1.00,
                    quantity: 1
                }]
            });
            // Also fire the standard outbound-click signal so it appears in
            // GA4's automatic "click" report alongside enhanced-measurement clicks.
            ga('select_promotion', {
                creative_name: 'amazon-cta',
                creative_slot: category,
                promotion_id: product,
                promotion_name: label
            });
            // Facebook Pixel — fire both standard events. `Purchase` carries
            // the $1 proxy value; `InitiateCheckout` triggers ads-manager
            // funnels that track checkout starts.
            fb('Purchase', {
                value: 1.00,
                currency: 'USD',
                content_ids: ['amz-' + product],
                content_name: '84ms — ' + product,
                content_type: 'product',
                content_category: 'amazon-click',
                num_items: 1
            });
            fb('InitiateCheckout', {
                value: 1.00,
                currency: 'USD',
                content_ids: ['amz-' + product],
                content_name: '84ms — ' + product,
                content_category: 'amazon-click',
                num_items: 1
            });
        }
    }, true);  // Capture phase so we run before any `target="_blank"` navigation.

    // ---------- Newsletter form ----------
    var form = document.querySelector('.newsletter-form');
    var status = document.querySelector('.newsletter-status');
    if (form) {
        form.addEventListener('submit', function (e) {
            var endpoint = form.getAttribute('data-endpoint') || '';
            ga('generate_lead', {
                form_endpoint: endpoint || 'mailto_fallback',
                page_path: window.location.pathname
            });
            fb('Lead', {
                content_name: 'newsletter_signup',
                content_category: endpoint ? 'form' : 'mailto_fallback'
            });
            if (!endpoint) {
                e.preventDefault();
                var emailField = form.querySelector('input[type="email"]');
                var email = emailField ? emailField.value.trim() : '';
                if (!email) return;
                var mailto = form.getAttribute('data-mailto');
                if (mailto) {
                    var url = mailto + (mailto.indexOf('?') === -1 ? '?' : '&')
                        + 'body=' + encodeURIComponent('email: ' + email);
                    window.location.href = url;
                }
                if (status) status.textContent = form.getAttribute('data-thanks') || '';
                form.reset();
            }
            // else: let the form submit normally to the configured endpoint
        });
    }
})();
