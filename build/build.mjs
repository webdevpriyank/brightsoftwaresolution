#!/usr/bin/env node
/**
 * Bright Software Solution — static site builder (no dependencies, Node 18+)
 *
 *   node build/build.mjs
 *
 * Source of truth:
 *   website/index.html        English homepage body (edit freely; keep the <!-- build:* --> / <!-- partial:* --> markers)
 *   website/assets/js/i18n.js Arabic strings for the homepage + shared header/footer
 *   build/site.mjs            business facts, homepage SEO meta, social profiles
 *   build/pages.mjs           service landing pages (EN, + AR where provided)
 *   build/legal.mjs           privacy policy + thank-you page
 *
 * Generates (into website/):
 *   index.html head/scripts, ar/index.html, /<service>/, /ar/<service>/, /privacy-policy/, /thank-you/, /ar/thank-you/,
 *   sitemap.xml, robots.txt, llms.txt, llms-full.txt, IndexNow key file.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { SITE, HOME, UI } from './site.mjs';
import { PAGES } from './pages.mjs';
import { PRIVACY, THANKS } from './legal.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'website');
const TODAY = new Date().toISOString().slice(0, 10);
const written = [];
const warnings = [];

/* ---------------- helpers ---------------- */
const read = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');
const write = (f, s) => {
  const p = path.join(OUT, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
  written.push(f);
};
const hash = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 8);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const abs = (p) => SITE.url + p;
const pageUrl = (slug, lang) => (lang === 'ar' ? '/ar' : '') + (slug ? `/${slug}/` : '/');
const homeUrl = (lang) => (lang === 'ar' ? '/ar/' : '/');
const setBlock = (html, name, content) => {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`missing build:${name} marker`);
  return html.replace(re, `$1\n${content}\n$2`);
};
const partial = (html, name) => {
  const m = html.match(new RegExp(`<!-- partial:${name} -->([\\s\\S]*?)<!-- /partial:${name} -->`));
  if (!m) throw new Error(`missing partial:${name}`);
  return m[1];
};
const checkLen = (where, title, desc) => {
  if (strip(title).length > 65) warnings.push(`${where}: title is ${strip(title).length} chars (aim ≤ 60)`);
  if (strip(desc).length > 165) warnings.push(`${where}: description is ${strip(desc).length} chars (aim ≤ 160)`);
};

const V = {
  css: hash('assets/css/style.css'),
  main: hash('assets/js/main.js'),
  i18n: hash('assets/js/i18n.js'),
  track: hash('assets/js/tracking.js'),
};

// Arabic dictionary from the runtime file (single source)
const ctx = { window: {} };
vm.runInNewContext(read('assets/js/i18n.js'), ctx);
const AR = ctx.window.BRIGHT_I18N.ar;

/* Translate every data-i18n element (no nested same-tag elements allowed) */
function translate(html, dict) {
  return html.replace(
    /<([a-z0-9]+)((?:\s[^>]*?)?\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi,
    (m, tag, attrs, key, inner) => {
      if (new RegExp(`<${tag}[\\s>]`, 'i').test(inner)) throw new Error(`nested <${tag}> inside data-i18n="${key}"`);
      if (!(key in dict)) throw new Error(`missing Arabic translation for "${key}" (add it to assets/js/i18n.js)`);
      return `<${tag}${attrs}>${dict[key]}</${tag}>`;
    }
  );
}
const enText = (html, key) => {
  const m = html.match(new RegExp(`data-i18n="${key.replace(/\./g, '\\.')}"[^>]*>([\\s\\S]*?)</`));
  return m ? strip(m[1]) : '';
};

/* ---------------- structured data ---------------- */
const ORG = `${SITE.url}/#organization`;
const WEBSITE = `${SITE.url}/#website`;
function orgNode() {
  const a = SITE.address;
  const n = {
    '@type': 'ProfessionalService',
    '@id': ORG,
    name: SITE.name,
    alternateName: SITE.alternateName,
    url: `${SITE.url}/`,
    logo: { '@type': 'ImageObject', url: abs(SITE.logo), width: 512, height: 512 },
    image: abs(SITE.ogImage),
    description: SITE.description,
    slogan: SITE.slogan,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.street,
      addressLocality: a.locality,
      addressRegion: a.region,
      ...(a.postalCode ? { postalCode: a.postalCode } : {}),
      addressCountry: a.country,
    },
    areaServed: [{ '@type': 'Country', name: 'India' }, { '@type': 'Place', name: 'Worldwide' }],
    contactPoint: [{
      '@type': 'ContactPoint', contactType: 'sales', telephone: SITE.phone, email: SITE.email,
      areaServed: ['IN', 'Worldwide'], availableLanguage: ['English'],
    }],
    knowsAbout: [
      'WhatsApp Business API', 'WhatsApp Cloud API', 'WhatsApp chatbots', 'WhatsApp Flows', 'Marketing automation',
      'Custom software development', 'ERP implementation', 'ERP customization', 'Graphic design', 'Brand identity',
      'Digital marketing', 'Search engine optimization', 'IT infrastructure management',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: PAGES.map((p) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: p.en.navTitle, url: abs(pageUrl(p.slug, 'en')) },
      })),
    },
  };
  if (SITE.sameAs.length) n.sameAs = SITE.sameAs;
  return n;
}
const websiteNode = () => ({
  '@type': 'WebSite', '@id': WEBSITE, url: `${SITE.url}/`, name: SITE.name, alternateName: SITE.alternateName,
  publisher: { '@id': ORG }, inLanguage: ['en', 'ar'],
});
const webPageNode = (o) => ({
  '@type': o.type || 'WebPage',
  '@id': `${abs(o.path)}#webpage`,
  url: abs(o.path),
  name: o.title,
  description: o.description,
  inLanguage: o.lang,
  isPartOf: { '@id': WEBSITE },
  about: { '@id': ORG },
  primaryImageOfPage: { '@type': 'ImageObject', url: abs(SITE.ogImage) },
  dateModified: TODAY,
  ...(o.breadcrumb ? { breadcrumb: { '@id': `${abs(o.path)}#breadcrumb` } } : {}),
});
const breadcrumbNode = (pathname, items) => ({
  '@type': 'BreadcrumbList',
  '@id': `${abs(pathname)}#breadcrumb`,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
});
const faqNode = (pathname, faqs) => ({
  '@type': 'FAQPage',
  '@id': `${abs(pathname)}#faq`,
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: strip(f.q), acceptedAnswer: { '@type': 'Answer', text: strip(f.a) } })),
});
const jsonld = (nodes) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c')}</script>`;

/* ---------------- head ---------------- */
function head(o) {
  const url = abs(o.path);
  const L = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${esc(o.title)}</title>`,
    `<meta name="description" content="${esc(o.description)}">`,
    `<meta name="robots" content="${o.noindex ? 'noindex, follow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'}">`,
  ];
  if (!o.noindex) L.push(`<link rel="canonical" href="${url}">`);
  if (o.alt) {
    L.push(`<link rel="alternate" hreflang="en" href="${abs(o.alt.en)}">`);
    L.push(`<link rel="alternate" hreflang="ar" href="${abs(o.alt.ar)}">`);
    L.push(`<link rel="alternate" hreflang="x-default" href="${abs(o.alt.en)}">`);
  }
  L.push(
    '<meta name="theme-color" content="#0D0D10">',
    `<meta name="author" content="${SITE.name}">`,
    `<meta name="geo.region" content="${SITE.address.regionCode}">`,
    `<meta name="geo.placename" content="${SITE.address.locality}, ${SITE.address.region}, ${SITE.address.countryName}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${SITE.name}">`,
    `<meta property="og:title" content="${esc(o.title)}">`,
    `<meta property="og:description" content="${esc(o.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${abs(SITE.ogImage)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${SITE.name} — ${SITE.slogan}">`,
    `<meta property="og:locale" content="${o.lang === 'ar' ? 'ar_AR' : 'en_IN'}">`,
    ...(o.alt ? [`<meta property="og:locale:alternate" content="${o.lang === 'ar' ? 'en_IN' : 'ar_AR'}">`] : []),
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(o.title)}">`,
    `<meta name="twitter:description" content="${esc(o.description)}">`,
    `<meta name="twitter:image" content="${abs(SITE.ogImage)}">`,
    '<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/assets/img/favicon-48.png" sizes="48x48" type="image/png">',
    '<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,400..800&family=Cairo:wght@400..800&display=swap" rel="stylesheet">',
    `<link rel="stylesheet" href="/assets/css/style.css?v=${V.css}">`,
    `<script>(function(){var d=document.documentElement;d.classList.add('js');try{if(sessionStorage.getItem('bright-seen'))d.classList.add('no-preload')}catch(e){d.classList.add('no-preload')}})();</script>`,
    `<script src="/assets/js/tracking.js?v=${V.track}"></script>`,
    jsonld(o.jsonld)
  );
  return L.map((x) => '  ' + x).join('\n');
}
const scripts = (lang) =>
  (lang === 'ar' ? `<script src="/assets/js/i18n.js?v=${V.i18n}" defer></script>\n` : '') +
  `<script src="/assets/js/main.js?v=${V.main}" defer></script>`;

/* ---------------- link helpers ---------------- */
const AR_PAGES = new Set(PAGES.filter((p) => p.ar).map((p) => p.slug));
function localizeLinks(html, lang) {
  if (lang !== 'ar') return html;
  return html.replace(/href="\/([a-z0-9-]+)\/"/g, (m, slug) => (AR_PAGES.has(slug) || slug === 'thank-you' ? `href="/ar/${slug}/"` : m));
}
function anchorsToHome(html, lang) {
  const base = homeUrl(lang);
  return html.replace(/(<a\b[^>]*?\shref=")#([A-Za-z][\w-]*)"/g, (m, pre, id) =>
    id === 'contact' || id === 'main' ? m : id === 'top' ? `${pre}${base}"` : `${pre}${base}#${id}"`
  );
}
function setToggle(html, href, hreflang) {
  return html.replace(/<a class="lang-toggle" href="[^"]*" hreflang="[^"]*"/, `<a class="lang-toggle" href="${href}" hreflang="${hreflang}"`);
}

/* ======================================================================
   1. Homepage (EN, in place) + Arabic homepage
   ====================================================================== */
let en = read('index.html');
const homeFaq = (lang, html) =>
  [...html.matchAll(/<summary><span data-i18n="([^"]+)">([\s\S]*?)<\/span>[\s\S]*?<div class="faq__a"><p data-i18n="([^"]+)">([\s\S]*?)<\/p>/g)].map((m) =>
    lang === 'ar' ? { q: AR[m[1]], a: AR[m[3]] } : { q: m[2], a: m[4] }
  );
function homeHead(lang, html) {
  const meta = HOME[lang];
  const p = homeUrl(lang);
  checkLen(`home/${lang}`, meta.title, meta.description);
  return head({
    lang, path: p, title: meta.title, description: meta.description, alt: { en: '/', ar: '/ar/' },
    jsonld: [orgNode(), websiteNode(), webPageNode({ path: p, title: meta.title, description: meta.description, lang }), faqNode(p, homeFaq(lang, html))],
  });
}
en = setBlock(en, 'head', homeHead('en', en));
en = setBlock(en, 'scripts', scripts('en'));
en = setToggle(en, '/ar/', 'ar');
write('index.html', en);

let ar = translate(en, AR)
  .replace('<html lang="en" dir="ltr">', '<html lang="ar" dir="rtl">')
  .replace('name="lang" value="en"', 'name="lang" value="ar"');
ar = setBlock(ar, 'head', homeHead('ar', en));
ar = setBlock(ar, 'scripts', scripts('ar'));
ar = setToggle(ar, '/', 'en');
ar = localizeLinks(ar, 'ar');
write('ar/index.html', ar);

/* Shared partials for generated pages */
const PART = {};
for (const [lang, html] of [['en', en], ['ar', ar]]) {
  PART[lang] = {
    top: anchorsToHome(partial(html, 'top'), lang),
    contact: partial(html, 'contact'),
    footer: anchorsToHome(partial(html, 'footer'), lang),
  };
}

/* ======================================================================
   2. Landing pages
   ====================================================================== */
const ICON = {
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  inbox: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/>',
  megaphone: '<path d="M3 10v4h3l6 4V6L6 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  form: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  bolt: '<path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12z"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13v1M15 13v1M2 13v3M22 13v3"/>',
  template: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 13h8M8 16h5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>',
  plug: '<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M9 9v11"/>',
  flow: '<rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v3a3 3 0 0 0 3 3H14"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  file: '<path d="M6 2.5h8l5 5V21a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 21z"/><path d="M14 2.5V8h5M9 13h7M9 17h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  star: '<path d="M12 3l2.2 5.6L20 10l-4.6 3.6L17 20l-5-3.3L7 20l1.6-6.4L4 10l5.8-1.4z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1.5-2 0-3.5h2.5A4.5 4.5 0 0 0 21 11c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5z"/><circle cx="15" cy="9" r="1.5"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ICON.check}</svg>`;
const ARROW = '<svg class="btn__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 1c-1.3-.5-2.4-1.6-2.9-2.9l1-1-1-2z"/></svg>';
const SLUG_KEYS = {
  'whatsapp-business-api': ['svc.0.t', 'svc.0.d'], 'software-development': ['svc.1.t', 'svc.1.d'],
  'erp-implementation-customization': ['svc.2.t', 'svc.2.d'], 'graphic-design': ['svc.3.t', 'svc.3.d'],
  branding: ['svc.4.t', 'svc.4.d'], 'digital-marketing': ['svc.5.t', 'svc.5.d'], 'infrastructure-management': ['svc.6.t', 'svc.6.d'],
};

function shell({ lang, headHtml, bodyAttr, main, contact = true, toggle }) {
  const p = PART[lang];
  return `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
${headHtml}
</head>
<body${bodyAttr || ''}>
${setToggle(localizeLinks(p.top, lang), toggle.href, toggle.lang)}
  <main id="main">
${main}
${contact ? (typeof contact === 'string' ? contact : p.contact) : ''}
  </main>
${localizeLinks(p.footer, lang)}
${scripts(lang)}
</body>
</html>
`;
}

function crumbsHtml(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items
    .map((it, i) => (i === items.length - 1 ? `<li aria-current="page">${esc(it.name)}</li>` : `<li><a href="${it.path}">${esc(it.name)}</a></li>`))
    .join('')}</ol></nav>`;
}

function renderPage(p, lang) {
  const c = p[lang];
  const u = UI[lang];
  const url = pageUrl(p.slug, lang);
  const alt = p.ar ? { en: pageUrl(p.slug, 'en'), ar: pageUrl(p.slug, 'ar') } : null;
  const crumbs = [{ name: u.home, path: homeUrl(lang) }, { name: c.navTitle, path: url }];
  checkLen(`${p.slug}/${lang}`, c.title, c.description);

  const nodes = [
    orgNode(), websiteNode(),
    webPageNode({ path: url, title: c.title, description: c.description, lang, breadcrumb: true }),
    breadcrumbNode(url, crumbs),
    {
      '@type': 'Service', '@id': `${abs(url)}#service`, name: c.navTitle, serviceType: p.serviceType,
      description: strip(c.lead), url: abs(url), provider: { '@id': ORG },
      areaServed: [{ '@type': 'Country', name: 'India' }, { '@type': 'Place', name: 'Worldwide' }],
      hasOfferCatalog: { '@type': 'OfferCatalog', name: c.featuresTitle, itemListElement: c.features.map((f) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: f.t, description: f.d } })) },
    },
    faqNode(url, c.faq),
  ];
  if (p.schema === 'SoftwareApplication') {
    nodes.push({
      '@type': 'SoftwareApplication', '@id': `${abs(url)}#software`, name: `${SITE.name} WhatsApp Business API Platform`,
      applicationCategory: 'BusinessApplication', applicationSubCategory: 'Customer messaging & marketing automation',
      operatingSystem: 'Web browser', url: abs(url), description: strip(c.lead), inLanguage: lang,
      featureList: c.features.map((f) => f.t), publisher: { '@id': ORG },
    });
  }

  const waText = encodeURIComponent(lang === 'ar' ? `مرحبًا برايت، أنا مهتم بـ ${c.navTitle}.` : `Hi Bright Software Solution, I'm interested in ${c.navTitle}.`);
  const sections = [];

  sections.push(`    <section class="page-hero">
      <div class="page-hero__bg" aria-hidden="true"><div class="hero__glow"></div><div class="hero__grid"></div></div>
      <div class="container">
        ${crumbsHtml([{ name: u.home, path: homeUrl(lang) }, { name: u.services, path: homeUrl(lang) + '#services' }, { name: c.navTitle, path: url }])}
        <p class="eyebrow eyebrow--light">${c.eyebrow}</p>
        <h1 class="page-hero__title">${c.h1}</h1>
        <p class="page-hero__lead">${c.lead}</p>
        <div class="hero__ctas">
          <a class="btn btn--red magnetic" href="#contact" data-interest="${esc(p.interest)}"><span>${u.getQuote}</span>${ARROW}</a>
          <a class="btn btn--ghost-light magnetic" href="https://wa.me/${SITE.whatsapp}?text=${waText}" target="_blank" rel="noopener">${WA_ICON}<span>${u.chatWa}</span></a>
        </div>
        <ul class="page-hero__facts">${c.facts.map((f) => `<li>${TICK}<span>${f}</span></li>`).join('')}</ul>
      </div>
    </section>`);

  sections.push(`    <section class="section page-intro">
      <div class="container page-intro__grid">
        <div>
          <h2 class="display" data-reveal>${c.introTitle}</h2>
          <div class="prose" data-reveal>${c.intro.map((x) => `<p>${x}</p>`).join('')}</div>
        </div>
        <aside class="glance" data-reveal><h3>${u.glance}</h3><ul>${c.glance.map((g) => `<li>${TICK}<span>${g}</span></li>`).join('')}</ul></aside>
      </div>
    </section>`);

  sections.push(`    <section class="section services page-features">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow eyebrow--light" data-reveal>${u.whatsIncluded}</p>
          <h2 class="display display--light" data-reveal>${c.featuresTitle}</h2>
          <p class="lead lead--light" data-reveal>${c.featuresLead}</p>
        </div>
        <div class="wa__features wa__features--flush">
${c.features.map((f) => `          <article class="wa-feat spot" data-reveal><div class="wa-feat__icon">${svg(f.icon)}</div><h3>${f.t}</h3><p>${f.d}</p></article>`).join('\n')}
        </div>
      </div>
    </section>`);

  if (c.compare) {
    sections.push(`    <section class="section page-compare">
      <div class="container">
        <p class="eyebrow" data-reveal>${u.compare}</p>
        <h2 class="display" data-reveal>${c.compare.title}</h2>
        <p class="lead" data-reveal>${c.compare.lead}</p>
        <div class="table-wrap" data-reveal>
          <table class="compare">
            <thead><tr>${c.compare.cols.map((h, i) => `<th scope="col"${i === 2 ? ' class="is-bright"' : ''}>${h}</th>`).join('')}</tr></thead>
            <tbody>
${c.compare.rows.map((r) => `              <tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td class="is-bright">${r[2]}</td></tr>`).join('\n')}
            </tbody>
          </table>
        </div>
      </div>
    </section>`);
  }

  if (c.onboarding) {
    sections.push(`    <section class="section wa page-onboard">
      <div class="container">
        <div class="wa__onboard wa__onboard--flush">
          <div data-reveal><p class="eyebrow eyebrow--light">${lang === 'ar' ? 'ابدأ الآن' : 'Get started'}</p><h2 class="wa__onboard-title">${c.onboarding.title}</h2></div>
          <ol class="wa__steps">
${c.onboarding.steps.map((s, i) => `            <li data-reveal><span>${i + 1}</span><h3>${s.t}</h3><p>${s.d}</p></li>`).join('\n')}
          </ol>
        </div>
      </div>
    </section>`);
  }

  sections.push(`    <section class="section why">
      <div class="container why__grid">
        <div class="why__intro"><div class="why__sticky">
          <p class="eyebrow" data-reveal>${u.whyBright}</p>
          <h2 class="display" data-reveal>${c.whyTitle}</h2>
          <svg class="why__mark" viewBox="0 0 674 817" aria-hidden="true"><use href="#logo-b"/></svg>
        </div></div>
        <ol class="why__list">
${c.why.map((w, i) => `          <li class="why__item" data-reveal><span class="why__n">0${i + 1}</span><div><h3>${w.t}</h3><p>${w.d}</p></div></li>`).join('\n')}
        </ol>
      </div>
    </section>`);

  sections.push(`    <section class="section page-uses">
      <div class="container">
        <h2 class="display" data-reveal>${c.usesTitle}</h2>
        <div class="uses-grid">
${c.uses.map((x) => `          <article class="use spot" data-reveal><h3>${x.t}</h3><p>${x.d}</p></article>`).join('\n')}
        </div>
        <div class="steps-strip" data-reveal>
          <p class="eyebrow">${u.howWeWork}</p>
          <ol>${u.steps.map((s, i) => `<li><span>0${i + 1}</span>${s}</li>`).join('')}</ol>
          <a class="link-arrow link-arrow--dark" href="${homeUrl(lang)}#process"><span>${u.howWeWorkLink}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
        </div>
      </div>
    </section>`);

  sections.push(`    <section class="section faq faq--white">
      <div class="container faq__grid">
        <div>
          <p class="eyebrow" data-reveal>FAQ</p>
          <h2 class="display" data-reveal>${u.faqTitle}</h2>
        </div>
        <div class="faq__list">
${c.faq.map((f) => `          <details class="faq__item" data-reveal><summary><span>${f.q}</span><i></i></summary><div class="faq__a"><p>${f.a}</p></div></details>`).join('\n')}
        </div>
      </div>
    </section>`);

  const rel = p.related.map((slug) => {
    const rp = PAGES.find((x) => x.slug === slug);
    const [tk, dk] = SLUG_KEYS[slug];
    const title = lang === 'ar' ? (rp.ar ? rp.ar.navTitle : AR[tk]) : rp.en.navTitle;
    const desc = lang === 'ar' ? (rp.ar ? rp.ar.description : AR[dk]) : rp.en.description;
    const href = lang === 'ar' && rp.ar ? pageUrl(slug, 'ar') : pageUrl(slug, 'en');
    return `          <a class="related__card" href="${href}" data-reveal><h3>${title}</h3><p>${desc}</p><span class="related__go">${u.explore} →</span></a>`;
  });
  sections.push(`    <section class="section related">
      <div class="container">
        <h2 class="display" data-reveal>${u.related}</h2>
        <div class="related__grid">
${rel.join('\n')}
        </div>
      </div>
    </section>`);

  const contact = PART[lang].contact.replace('<form class="form" id="contact-form"', `<form class="form" id="contact-form" data-preselect="${esc(p.interest)}"`);
  const otherLang = lang === 'ar' ? 'en' : 'ar';
  return shell({
    lang,
    headHtml: head({ lang, path: url, title: c.title, description: c.description, alt, jsonld: nodes }),
    bodyAttr: ` data-page="${p.slug}"`,
    main: sections.join('\n\n'),
    contact,
    toggle: { href: alt ? alt[otherLang] : homeUrl(otherLang), lang: otherLang },
  });
}

for (const p of PAGES) {
  write(`${p.slug}/index.html`, renderPage(p, 'en'));
  if (p.ar) write(`ar/${p.slug}/index.html`, renderPage(p, 'ar'));
}

/* ======================================================================
   3. Privacy policy + thank-you pages
   ====================================================================== */
{
  const url = `/${PRIVACY.slug}/`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Privacy Policy', path: url }];
  checkLen('privacy', PRIVACY.title, PRIVACY.description);
  write(`${PRIVACY.slug}/index.html`, shell({
    lang: 'en',
    headHtml: head({
      lang: 'en', path: url, title: PRIVACY.title, description: PRIVACY.description,
      jsonld: [orgNode(), websiteNode(), webPageNode({ path: url, title: PRIVACY.title, description: PRIVACY.description, lang: 'en', breadcrumb: true }), breadcrumbNode(url, crumbs)],
    }),
    bodyAttr: ' data-page="privacy"',
    main: `    <section class="page-hero page-hero--compact">
      <div class="page-hero__bg" aria-hidden="true"><div class="hero__glow"></div><div class="hero__grid"></div></div>
      <div class="container">
        ${crumbsHtml(crumbs)}
        <h1 class="page-hero__title">${PRIVACY.h1}</h1>
        <p class="page-hero__lead">${UI.en.updated}: ${PRIVACY.updated}</p>
      </div>
    </section>
    <section class="section legal"><div class="container"><div class="prose prose--legal">${PRIVACY.body}</div></div></section>`,
    contact: false,
    toggle: { href: '/ar/', lang: 'ar' },
  }));
}
for (const lang of ['en', 'ar']) {
  const t = THANKS[lang];
  const url = lang === 'ar' ? '/ar/thank-you/' : '/thank-you/';
  write(`${lang === 'ar' ? 'ar/' : ''}thank-you/index.html`, shell({
    lang,
    headHtml: head({ lang, path: url, title: t.title, description: t.lead, noindex: true, jsonld: [orgNode(), websiteNode()] }),
    bodyAttr: ' data-page="thank-you"',
    main: `    <section class="page-hero page-hero--thanks">
      <div class="page-hero__bg" aria-hidden="true"><div class="hero__glow"></div><div class="hero__grid"></div></div>
      <div class="container">
        <div class="thanks__icon">${TICK}</div>
        <h1 class="page-hero__title">${t.h1}</h1>
        <p class="page-hero__lead">${t.lead}</p>
        <p class="thanks__next">${t.next}</p>
        <div class="hero__ctas">
          <a class="btn btn--red" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">${WA_ICON}<span>${t.wa}</span></a>
          <a class="btn btn--ghost-light" href="tel:+${SITE.whatsapp}" dir="ltr"><span>${t.call} · ${SITE.phoneDisplay}</span></a>
        </div>
        <p class="thanks__links"><a href="${homeUrl(lang)}">← ${t.back}</a> · <a href="${pageUrl('whatsapp-business-api', lang)}">${t.explore}</a></p>
      </div>
    </section>`,
    contact: false,
    toggle: { href: lang === 'ar' ? '/thank-you/' : '/ar/thank-you/', lang: lang === 'ar' ? 'en' : 'ar' },
  }));
}

/* ======================================================================
   4. sitemap.xml, robots.txt, llms.txt, llms-full.txt, IndexNow key
   ====================================================================== */
const sitemapEntries = [
  { en: '/', ar: '/ar/' },
  ...PAGES.map((p) => (p.ar ? { en: pageUrl(p.slug, 'en'), ar: pageUrl(p.slug, 'ar') } : { en: pageUrl(p.slug, 'en') })),
  { en: `/${PRIVACY.slug}/` },
];
const urlXml = (loc, alt) =>
  `  <url>\n    <loc>${abs(loc)}</loc>\n    <lastmod>${TODAY}</lastmod>\n` +
  (alt
    ? `    <xhtml:link rel="alternate" hreflang="en" href="${abs(alt.en)}"/>\n    <xhtml:link rel="alternate" hreflang="ar" href="${abs(alt.ar)}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(alt.en)}"/>\n`
    : '') +
  '  </url>';
const urls = [];
for (const e of sitemapEntries) {
  const alt = e.ar ? e : null;
  urls.push(urlXml(e.en, alt));
  if (e.ar) urls.push(urlXml(e.ar, alt));
}
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`);

write('robots.txt', `# ${SITE.name} — robots.txt
# Search engines and AI assistants are welcome to crawl and cite this website.

User-agent: *
Allow: /
Disallow: /contact.php
Disallow: /thank-you/
Disallow: /ar/thank-you/

# AI search & assistant crawlers (explicitly allowed)
# OpenAI (ChatGPT search & GPTs), Google (Gemini / AI Overviews), Anthropic (Claude), Perplexity,
# Apple Intelligence, Microsoft Bing/Copilot, Meta AI, Amazon, Common Crawl, DuckDuckGo, Mistral.
# xAI Grok has no separately documented crawler; it is covered by the "*" group above.
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: GPTBot
User-agent: Google-Extended
User-agent: Googlebot
User-agent: Bingbot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Applebot
User-agent: Applebot-Extended
User-agent: meta-externalagent
User-agent: Amazonbot
User-agent: DuckAssistBot
User-agent: MistralAI-User
User-agent: CCBot
Allow: /
Disallow: /contact.php
Disallow: /thank-you/
Disallow: /ar/thank-you/

Sitemap: ${SITE.url}/sitemap.xml
`);

// llms.txt — concise map for AI assistants (llmstxt.org)
const homeAbout = [enText(en, 'about.p1'), enText(en, 'about.p2')];
write('llms.txt', `# ${SITE.name}

> ${SITE.description} Based in ${SITE.address.locality}, ${SITE.address.region}, ${SITE.address.countryName}; serving businesses in India and international markets.

Key facts:
- Company: ${SITE.name} — ${SITE.slogan}
- Experience: ${SITE.experience} in technology and creative work
- Flagship product: WhatsApp Business API platform built on Meta's official WhatsApp Cloud API (own-number onboarding via Meta embedded signup, shared team inbox, broadcast campaigns, WhatsApp Flows, automation, no-code chatbots, integrations)
- Location: ${SITE.address.street}, ${SITE.address.locality}, ${SITE.address.region}, ${SITE.address.countryName}
- Email: ${SITE.email}
- Phone / WhatsApp: ${SITE.phoneDisplay}
- Languages: website in English and Arabic

## Services

${PAGES.map((p) => `- [${p.en.navTitle}](${abs(pageUrl(p.slug, 'en'))}): ${p.en.description}`).join('\n')}

## Company

- [Home — about, purpose, process and FAQ](${SITE.url}/)
- [Arabic version](${SITE.url}/ar/)
- [Contact](${SITE.url}/#contact): ${SITE.email}, ${SITE.phoneDisplay}

## Optional

- [Full website content in plain text](${SITE.url}/llms-full.txt)
- [Privacy policy](${SITE.url}/${PRIVACY.slug}/)
`);

const md = [];
md.push(`# ${SITE.name} — full website content\n\nSource: ${SITE.url}/ · Updated: ${TODAY}\n`);
md.push(`## About\n\n${homeAbout.join('\n\n')}\n\nPurpose: Make technology useful. Make business simpler. Make growth possible.\n`);
md.push(`Contact: ${SITE.email} · ${SITE.phoneDisplay} · ${SITE.address.street}, ${SITE.address.locality}, ${SITE.address.region}, ${SITE.address.countryName}\n`);
md.push(`## How we work\n\n${['Discover — understand your business, objectives, users, workflows and current challenges.', 'Define — agree on scope, priorities, deliverables and a practical plan of action.', 'Design & plan — shape the solution, experience and delivery approach before execution.', 'Build & implement — develop, customize, configure or create the agreed solution.', 'Review & refine — validate the work, gather feedback and make considered improvements.', 'Support & evolve — provide ongoing assistance and help the solution adapt as needs change.'].map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`);
for (const p of PAGES) {
  const c = p.en;
  md.push(`---\n\n## ${c.navTitle}\n\nURL: ${abs(pageUrl(p.slug, 'en'))}\n\n${strip(c.lead)}\n\n### ${strip(c.introTitle)}\n\n${c.intro.map(strip).join('\n\n')}\n`);
  md.push(`### ${strip(c.featuresTitle)}\n\n${c.features.map((f) => `- **${strip(f.t)}** — ${strip(f.d)}`).join('\n')}\n`);
  if (c.compare) md.push(`### ${strip(c.compare.title)}\n\n| ${c.compare.cols.join(' | ')} |\n|${c.compare.cols.map(() => '---').join('|')}|\n${c.compare.rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`);
  if (c.onboarding) md.push(`### ${strip(c.onboarding.title)}\n\n${c.onboarding.steps.map((s, i) => `${i + 1}. **${s.t}** — ${s.d}`).join('\n')}\n`);
  md.push(`### ${strip(c.whyTitle)}\n\n${c.why.map((w) => `- **${strip(w.t)}** — ${strip(w.d)}`).join('\n')}\n`);
  md.push(`### ${strip(c.usesTitle)}\n\n${c.uses.map((x) => `- **${strip(x.t)}** — ${strip(x.d)}`).join('\n')}\n`);
  md.push(`### FAQ\n\n${c.faq.map((f) => `**Q: ${strip(f.q)}**\n\nA: ${strip(f.a)}`).join('\n\n')}\n`);
}
md.push(`---\n\n## General FAQ\n\n${homeFaq('en', en).map((f) => `**Q: ${strip(f.q)}**\n\nA: ${strip(f.a)}`).join('\n\n')}\n`);
write('llms-full.txt', md.join('\n'));

write(`${SITE.indexNowKey}.txt`, SITE.indexNowKey);

/* ---------------- report ---------------- */
console.log(`Built ${written.length} files → website/`);
for (const f of written) console.log('  ' + f);
if (warnings.length) {
  console.log('\nSEO warnings:');
  for (const w of warnings) console.log('  ⚠ ' + w);
}
