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

1. hPanel → **Emails**: make sure `info@brightsoftwaresolution.in` exists and create `no-reply@brightsoftwaresolution.in`
   (the form sends from it).
2. hPanel → **File Manager** → `public_html` → upload everything inside `website/`, including the hidden `.htaccess`.
3. hPanel → **Security → SSL**: install the free certificate.
4. Submit the form once and confirm the email arrives (it now includes the campaign source).

## Montaser Arabic font

Commercial typeface — add `assets/fonts/MontaserArabic-Regular.woff2` and `MontaserArabic-Bold.woff2`.
Until then Arabic uses Cairo.
