/* ==========================================================================
   Bright Software Solution — analytics, advertising & consent
   --------------------------------------------------------------------------
   1. Paste your IDs into CONFIG below (leave empty to disable a tool).
   2. Recommended: use Google Tag Manager only (gtmId) and configure GA4,
      Google Ads, Meta etc. inside GTM using the dataLayer events listed below.
   3. Run `node build/build.mjs` afterwards so pages pick up the new file version.

   dataLayer events pushed by the site:
     generate_lead      – contact form submitted (fires on /thank-you/)
     click_to_call      – tel: link clicked
     click_whatsapp     – wa.me link clicked
     click_email        – mailto: link clicked
     select_interest    – "Book a demo" / "Get a quote" buttons
   Google Consent Mode v2 is built in: nothing is stored until visitors accept.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    gtmId: '',               // 'GTM-XXXXXXX'  (recommended)
    ga4Id: '',               // 'G-XXXXXXXXXX' (only if NOT using GTM)
    googleAdsId: '',         // 'AW-123456789' (only if NOT using GTM)
    googleAdsLeadLabel: '',  // conversion label for form leads, e.g. 'AbCdEfGhIj'
    googleAdsCallLabel: '',  // conversion label for phone-click conversions
    metaPixelId: '',         // '123456789012345'
    clarityId: '',           // Microsoft Clarity project id
    linkedinPartnerId: '',   // LinkedIn Insight Tag partner id
    requireConsent: true     // show cookie banner; non-essential tags wait for "Accept"
  };

  var w = window, d = document;
  var hasAny = !!(CONFIG.gtmId || CONFIG.ga4Id || CONFIG.googleAdsId || CONFIG.metaPixelId || CONFIG.clarityId || CONFIG.linkedinPartnerId);
  var KEY = 'bright-consent';
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  function load(src, attrs) {
    var s = d.createElement('script'); s.async = true; s.src = src;
    if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]);
    (d.head || d.documentElement).appendChild(s);
  }

  /* ---------- Google Consent Mode v2 + Google tags ---------- */
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  w.gtag = w.gtag || gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
    functionality_storage: 'granted', security_storage: 'granted', wait_for_update: 500
  });
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);

  if (CONFIG.gtmId) {
    w.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    load('https://www.googletagmanager.com/gtm.js?id=' + CONFIG.gtmId);
  } else if (CONFIG.ga4Id || CONFIG.googleAdsId) {
    load('https://www.googletagmanager.com/gtag/js?id=' + (CONFIG.ga4Id || CONFIG.googleAdsId));
    gtag('js', new Date());
    if (CONFIG.ga4Id) gtag('config', CONFIG.ga4Id);
    if (CONFIG.googleAdsId) gtag('config', CONFIG.googleAdsId);
  }

  /* ---------- Non-Google tags (only after consent) ---------- */
  var nonGoogleLoaded = false;
  function loadNonGoogle() {
    if (nonGoogleLoaded) return; nonGoogleLoaded = true;
    if (CONFIG.metaPixelId) {
      /* Meta Pixel */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(w, d, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      w.fbq('init', CONFIG.metaPixelId); w.fbq('track', 'PageView');
    }
    if (CONFIG.clarityId) {
      (function (c, l, a, r, i) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; load('https://www.clarity.ms/tag/' + i); })(w, d, 'clarity', 'script', CONFIG.clarityId);
    }
    if (CONFIG.linkedinPartnerId) {
      w._linkedin_partner_id = CONFIG.linkedinPartnerId;
      w._linkedin_data_partner_ids = w._linkedin_data_partner_ids || []; w._linkedin_data_partner_ids.push(CONFIG.linkedinPartnerId);
      load('https://snap.licdn.com/li.lms-analytics/insight.min.js');
    }
  }

  function grant() {
    gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
    w.dataLayer.push({ event: 'consent_granted' });
    loadNonGoogle();
  }
  function deny() {
    gtag('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  }
  var consent = CONFIG.requireConsent ? ls.get(KEY) : 'granted';
  if (consent === 'granted') grant();

  /* ---------- Attribution (UTM / click ids), session-scoped ---------- */
  var ATTR = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'li_fat_id'];
  (function capture() {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var found = {}, has = false;
    ATTR.forEach(function (k) { var v = q.get(k); if (v) { found[k] = v.slice(0, 200); has = true; } });
    var ref = d.referrer && d.referrer.indexOf(location.host) === -1 ? d.referrer.slice(0, 300) : '';
    if (!ss.get('bright-attr')) {
      found.landing_page = location.pathname; found.referrer = ref;
      ss.set('bright-attr', JSON.stringify(found));
    } else if (has) {
      var cur = JSON.parse(ss.get('bright-attr') || '{}');
      for (var k in found) cur[k] = found[k];
      ss.set('bright-attr', JSON.stringify(cur));
    }
  })();
  function attribution() { try { return JSON.parse(ss.get('bright-attr') || '{}'); } catch (e) { return {}; } }

  /* ---------- Event API ---------- */
  var FB = { generate_lead: 'Lead', click_to_call: 'Contact', click_whatsapp: 'Contact', click_email: 'Contact' };
  function track(name, params) {
    params = params || {};
    var payload = { event: name }; for (var k in params) payload[k] = params[k];
    w.dataLayer.push(payload);
    if (!CONFIG.gtmId && (CONFIG.ga4Id || CONFIG.googleAdsId)) {
      gtag('event', name, params);
      if (name === 'generate_lead' && CONFIG.googleAdsId && CONFIG.googleAdsLeadLabel) gtag('event', 'conversion', { send_to: CONFIG.googleAdsId + '/' + CONFIG.googleAdsLeadLabel });
      if (name === 'click_to_call' && CONFIG.googleAdsId && CONFIG.googleAdsCallLabel) gtag('event', 'conversion', { send_to: CONFIG.googleAdsId + '/' + CONFIG.googleAdsCallLabel });
    }
    if (w.fbq && FB[name]) w.fbq('track', FB[name], params);
    if (w.lintrk && name === 'generate_lead') { /* add LinkedIn conversion id here if used: w.lintrk('track', { conversion_id: 0 }); */ }
  }

  /* ---------- Click tracking ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var where = { link_location: location.pathname };
    if (href.indexOf('tel:') === 0) track('click_to_call', where);
    else if (href.indexOf('mailto:') === 0) track('click_email', where);
    else if (/wa\.me\//.test(href)) track('click_whatsapp', where);
    if (a.hasAttribute('data-interest')) track('select_interest', { interest: a.getAttribute('data-interest'), link_location: location.pathname });
  }, true);

  /* ---------- Consent banner ---------- */
  var T = {
    en: { text: 'We use cookies to understand how our website is used and to measure our advertising. You can accept or reject non-essential cookies.', more: 'Privacy policy', accept: 'Accept', reject: 'Reject', label: 'Cookie preferences' },
    ar: { text: 'نستخدم ملفات تعريف الارتباط لفهم كيفية استخدام موقعنا وقياس إعلاناتنا. يمكنك قبول ملفات تعريف الارتباط غير الضرورية أو رفضها.', more: 'سياسة الخصوصية', accept: 'قبول', reject: 'رفض', label: 'تفضيلات ملفات تعريف الارتباط' }
  };
  function banner() {
    var old = d.querySelector('.consent'); if (old) old.remove();
    var t = T[d.documentElement.lang === 'ar' ? 'ar' : 'en'];
    var el = d.createElement('div');
    el.className = 'consent'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t.label);
    el.innerHTML = '<p>' + t.text + ' <a href="/privacy-policy/">' + t.more + '</a></p>' +
      '<div class="consent__actions"><button type="button" class="btn btn--sm btn--ghost-light" data-c="reject">' + t.reject + '</button>' +
      '<button type="button" class="btn btn--sm btn--red" data-c="accept">' + t.accept + '</button></div>';
    el.addEventListener('click', function (e) {
      var c = e.target.closest('[data-c]'); if (!c) return;
      if (c.getAttribute('data-c') === 'accept') { ls.set(KEY, 'granted'); grant(); } else { ls.set(KEY, 'denied'); deny(); }
      el.classList.add('is-out'); setTimeout(function () { el.remove(); }, 400);
    });
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
  }

  function onReady() {
    // cookie settings link (footer) only makes sense when tracking is configured
    var openers = d.querySelectorAll('[data-consent-open]');
    for (var i = 0; i < openers.length; i++) {
      if (!hasAny || !CONFIG.requireConsent) { var sep = openers[i].previousSibling; if (sep && sep.nodeType === 3) sep.textContent = sep.textContent.replace(/·\s*$/, ''); openers[i].remove(); }
      else openers[i].addEventListener('click', banner);
    }
    if (hasAny && CONFIG.requireConsent && !ls.get(KEY)) banner();

    // conversion: fire once when the thank-you page loads after a real submission
    if (d.body.getAttribute('data-page') === 'thank-you') {
      var lead = ss.get('bright-lead');
      if (lead) {
        var info = {}; try { info = JSON.parse(lead); } catch (e) {}
        track('generate_lead', { form: 'contact', interests: info.interests || '', lang: info.lang || d.documentElement.lang });
        ss.del('bright-lead');
      }
    }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', onReady); else onReady();

  w.BrightTrack = { event: track, attribution: attribution, openConsent: banner, config: CONFIG };
})();
