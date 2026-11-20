# Bright Software Solution — Website

Static HTML/CSS/JS + one PHP file (contact form). Built for Hostinger shared hosting — no Node process on the server.

**Pages are generated.** After editing anything, run from the project root:

```bash
node build/build.mjs
```

See `build/README.md` for what to edit where, plus the SEO / SEM / AI-search launch checklist.

```text
website/                       ← upload the CONTENTS of this folder to public_html
├── index.html                 ← homepage (EN source; head/scripts are filled in by the build)
├── ar/                        ← Arabic homepage + Arabic WhatsApp page (generated)
├── whatsapp-business-api/ software-development/ erp-implementation-customization/
│   graphic-design/ branding/ digital-marketing/ infrastructure-management/   (generated)
├── privacy-policy/ thank-you/ (generated)
├── contact.php                ← form → info@brightsoftwaresolution.in (+ campaign source)
├── sitemap.xml robots.txt llms.txt llms-full.txt <indexnow-key>.txt   (generated)
├── .htaccess · 404.html · site.webmanifest
└── assets/ css · js (main, i18n, tracking) · img · fonts
```

## Deploy to Hostinger

**Recommended — Git deployment (auto-updates on every push):**

The site lives in `website/`, but Hostinger deploys a branch's *root* into `public_html`. A GitHub Action
(`.github/workflows/hostinger-branch.yml`) therefore publishes `website/` as the root of the **`hostinger`**
branch on every push to `main`. Deploy that branch — never `main` (deploying `main` puts the repo root in
`public_html` → no index file → **403 Forbidden**, and exposes build files).

1. hPanel → **Websites → Manage → Advanced → Git** → create a repository:
   - Repository: `https://github.com/webdevpriyank/brightsoftwaresolution.git`
   - Branch: **`hostinger`**
   - Directory: leave empty (installs into `public_html`; it must be empty first)
2. Click **Deploy**. Then turn on **Auto deployment**, copy the webhook URL, and add it in GitHub →
   repo **Settings → Webhooks → Add webhook** (push events).
3. hPanel → **Emails**: make sure `info@brightsoftwaresolution.in` exists and create `no-reply@brightsoftwaresolution.in`
   (the form sends from it).
4. hPanel → **Security → SSL**: install the free certificate.
5. Submit the form once and confirm the email arrives (it includes the campaign source).

**Manual alternative:** hPanel → **File Manager** → `public_html` → upload everything *inside* `website/`,
including the hidden `.htaccess`.

## Montaser Arabic font

Commercial typeface — add `assets/fonts/MontaserArabic-Regular.woff2` and `MontaserArabic-Bold.woff2`.
Until then Arabic uses Cairo.
