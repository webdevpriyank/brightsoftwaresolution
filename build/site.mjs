// Site-wide facts used for meta tags, structured data (JSON-LD), sitemap and llms.txt.
// Keep these 100% consistent with Google Business Profile, LinkedIn, directories etc. (NAP consistency).

export const SITE = {
  url: 'https://brightsoftwaresolution.in',
  name: 'Bright Software Solution',
  alternateName: 'Bright',
  legalName: 'Bright Software Solution',
  slogan: 'Technology. Innovation. Growth.',
  description:
    'Bright Software Solution is a technology and digital solutions company with 10+ years of experience. ' +
    'Its flagship product is a WhatsApp Business API (Cloud API) platform for team inbox, broadcast campaigns, ' +
    'WhatsApp Flows, automation and chatbots. It also provides custom software development, ERP implementation ' +
    'and customization, graphic design, brand building, digital marketing and infrastructure management.',
  email: 'info@brightsoftwaresolution.in',
  phone: '+91-9913174798',
  phoneDisplay: '+91 99131 74798',
  whatsapp: '919913174798',
  address: {
    street: '808, A Wing, Sonorous',
    locality: 'Vapi',
    region: 'Gujarat',
    regionCode: 'IN-GJ',
    country: 'IN',
    countryName: 'India',
    postalCode: '', // TODO: add PIN code (e.g. 396191) — improves local SEO
  },
  areaServed: ['India', 'Worldwide'],
  experience: '10+ years',
  // Add every official profile URL here (LinkedIn, Facebook, Instagram, X, YouTube, Google Business Profile, Clutch…).
  // These become schema.org "sameAs" links, which help Google and AI assistants recognise the company as one entity.
  sameAs: [
    // 'https://www.linkedin.com/company/…',
    // 'https://www.facebook.com/…',
    // 'https://www.instagram.com/…',
    // 'https://x.com/…',
    // 'https://g.page/…',
  ],
  logo: '/assets/img/icon-512.png',
  ogImage: '/assets/img/og-image.jpg',
  indexNowKey: '797c4c368b5b18d131b7a4de6b355c0f',
};

// Homepage meta (EN + AR)
export const HOME = {
  en: {
    title: 'Bright Software Solution – WhatsApp API, Software & ERP',
    description:
      'WhatsApp Business API platform plus custom software, ERP, branding, digital marketing and infrastructure services. 10+ years. Vapi, India.',
  },
  ar: {
    title: 'برايت للحلول البرمجية – منصة واتساب للأعمال والبرمجيات وERP',
    description:
      'منصة WhatsApp Business API للمحادثات والحملات وروبوتات الدردشة، مع تطوير البرمجيات وأنظمة ERP والتسويق الرقمي. خبرة تتجاوز 10 سنوات.',
  },
};

// Shared UI strings for generated pages
export const UI = {
  en: {
    home: 'Home', services: 'Services', getQuote: 'Get a quote', chatWa: 'Chat on WhatsApp',
    glance: 'At a glance', faqTitle: 'Frequently asked questions', related: 'Related services',
    explore: 'Explore', howWeWork: 'How we work', howWeWorkLink: 'See our full process',
    steps: ['Discover', 'Define', 'Design & plan', 'Build & implement', 'Review & refine', 'Support & evolve'],
    whatsIncluded: 'What’s included', whyBright: 'Why Bright', compare: 'Comparison',
    updated: 'Last updated',
  },
  ar: {
    home: 'الرئيسية', services: 'الخدمات', getQuote: 'اطلب عرض سعر', chatWa: 'تواصل عبر واتساب',
    glance: 'نظرة سريعة', faqTitle: 'الأسئلة الشائعة', related: 'خدمات ذات صلة',
    explore: 'استكشف', howWeWork: 'كيف نعمل', howWeWorkLink: 'تعرّف على منهجيتنا الكاملة',
    steps: ['الاكتشاف', 'التحديد', 'التصميم والتخطيط', 'البناء والتطبيق', 'المراجعة والتحسين', 'الدعم والتطوّر'],
    whatsIncluded: 'ماذا تتضمّن الخدمة', whyBright: 'لماذا برايت', compare: 'مقارنة',
    updated: 'آخر تحديث',
  },
};
