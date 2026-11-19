# SEO, SEM & AI-search playbook — Bright Software Solution

## How the site is built

```bash
node build/build.mjs      # regenerate all pages, sitemap, robots, llms.txt (run after ANY edit)
node build/indexnow.mjs   # after uploading to the live site: ping Bing/ChatGPT search/Copilot
```

| Edit this | To change |
|---|---|
| `website/index.html` | Homepage content (English) |
| `website/assets/js/i18n.js` | Arabic text for the homepage, header and footer |
| `build/site.mjs` | Business facts (NAP), homepage title/description, social profiles (`sameAs`) |
| `build/pages.mjs` | Service landing pages: titles, descriptions, copy, FAQs |
| `build/legal.mjs` | Privacy policy, thank-you page |
| `website/assets/js/tracking.js` | GTM / GA4 / Google Ads / Meta Pixel / Clarity / LinkedIn IDs |

Then upload the whole `website/` folder to Hostinger `public_html`.

## What's already built in

**Technical SEO**
- One crawlable, server-rendered URL per topic: 7 service landing pages + homepage + privacy.
- Real Arabic URLs (`/ar/`, `/ar/whatsapp-business-api/`) with reciprocal `hreflang` + `x-default`.
- Unique title, description, canonical, Open Graph and Twitter tags on every page.
- Structured data (JSON-LD `@graph`): `ProfessionalService` (LocalBusiness) with address, contact point and service catalogue, `WebSite`, `WebPage`, `BreadcrumbList`, `Service`, `SoftwareApplication` (WhatsApp platform), `FAQPage`.
- `sitemap.xml` with language alternates, `robots.txt`, 48px+ favicons, web manifest, HTTPS + non-www redirects, gzip, caching.
- One `<h1>` per page, semantic headings, breadcrumbs, internal links between related services.

**AI search (ChatGPT, Gemini, Claude, Grok, Perplexity, Copilot)**
- `robots.txt` explicitly allows OAI-SearchBot, ChatGPT-User, GPTBot, Google-Extended, Claude-SearchBot/User, ClaudeBot, PerplexityBot, Applebot, Bingbot, Meta, Amazon, DuckDuckGo, Mistral, CCBot. Grok has no documented crawler and is covered by `*`.
- `/llms.txt` (summary + links) and `/llms-full.txt` (all content as plain Markdown).
- Content written to be quotable: “What is the WhatsApp Business API?” definition, comparison table, Q&A on every page, consistent facts everywhere.
- IndexNow key + script — Bing’s index feeds ChatGPT search and Copilot.

**SEM / paid ads**
- Dedicated landing page per service — use these as ad final URLs (better Quality Score than the homepage).
- Contact form preselects the page’s service; **UTM tags, gclid/fbclid/msclkid and landing page are included in every enquiry email**.
- `/thank-you/` page (noindex) fires `generate_lead` once per real submission → URL- or event-based conversions.
- Click events: `click_to_call`, `click_whatsapp`, `click_email`, `select_interest`.
- Google Consent Mode v2 + cookie banner (only appears once an ID is configured); privacy policy page (required by Google Ads, Meta and Meta’s WhatsApp onboarding).

## Launch checklist (things only you can do)

1. **Upload & SSL** — upload `website/`, enable SSL in hPanel.
2. **Google Search Console** — add a *Domain* property, verify with a DNS TXT record in Hostinger DNS, submit `https://brightsoftwaresolution.in/sitemap.xml`, then “Request indexing” for the homepage and `/whatsapp-business-api/`.
3. **Bing Webmaster Tools** — “Import from Google Search Console” (1 click), submit the sitemap, then run `node build/indexnow.mjs`. *(Bing powers ChatGPT search and Copilot results.)*
4. **Google Business Profile** — create/claim “Bright Software Solution”, category *Software company*, same address/phone as the site, add services (WhatsApp Business API, ERP…), photos, website link. This is the #1 lever for “software company in Vapi” searches and Gemini/Maps answers.
5. **Social profiles** — create/update LinkedIn company page, Facebook, Instagram, X, YouTube with identical name, address, phone and description; paste their URLs into `sameAs` in `build/site.mjs` and rebuild.
6. **Add the PIN code** to `address.postalCode` in `build/site.mjs`.
7. **Tracking** — create a GTM container, paste `GTM-…` into `tracking.js`, then in GTM add: GA4 config, Google Ads conversion on `generate_lead`, Ads call conversion on `click_to_call`, Meta Pixel Lead. Rebuild + upload.
8. **Google Ads** — link GA4 ↔ Ads, import `generate_lead` as primary conversion, enable *enhanced conversions*, point each ad group to its landing page (e.g. “whatsapp business api” → `/whatsapp-business-api/`).
9. **Meta** — if you are a Meta Tech Provider / Business Partner, add that badge and copy to the WhatsApp page (strong trust + ranking signal).
10. **Mentions & citations (big for AI answers)** — list the company on Clutch, GoodFirms, G2/Capterra (for the WhatsApp platform), JustDial, IndiaMART, Sulekha; publish LinkedIn articles; get reviews on Google. AI assistants recommend brands that are *described consistently by many independent sources*.

## Keep growing (monthly)

- Publish 2–4 helpful articles/month targeting questions people ask, e.g. “WhatsApp Business API pricing in India”, “WhatsApp API vs Business app”, “How to get the green tick”, “ERP customization checklist”. A `/blog/` can be added to the builder.
- Add real case studies (client, problem, solution, measurable result) — the strongest content for both Google and AI assistants.
- Name the ERP systems you work with (e.g. Odoo, ERPNext, SAP Business One, Tally) in `build/pages.mjs` — people search by product name.
- Check Search Console → Performance for queries you almost rank for, and expand those pages.
- Re-run `node build/build.mjs` + `node build/indexnow.mjs` after every content change.
