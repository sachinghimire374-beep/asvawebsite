import manifest from './company-images.generated.json';
import altJson from '../public/images/company/alt.json';

/**
 * Photography used in the fixed page layouts.
 *
 * Defaults are stock photos in `public/images` (Unsplash, free to use under the
 * Unsplash License). The company's own photos go in `public/images/company` and
 * override a stock photo of the same base name — see the README in that folder.
 *
 * The company folder listing is generated at build time (scripts/gen-company-images.mjs) because
 * Cloudflare Workers have no filesystem. Re-run it (or any build) after adding a photo.
 */
const COMPANY_FILES = new Set<string>(manifest.files);
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

/** Optional `public/images/company/alt.json` — alt text for replaced photos, keyed by slot name. */
function readAltOverrides(): Record<string, string> {
  const parsed: unknown = altJson;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1].trim() !== ''));
}

const ALT_OVERRIDES = readAltOverrides();

export interface SiteImage {
  src: string;
  alt: string;
  /** Optional CSS `object-position` override when a photo needs non-center framing in landscape crops. */
  position?: string;
}

/**
 * Uses `public/images/company/<name>.<ext>` when present, otherwise the stock photo.
 * `stockFile` lets a slot fall back to a differently named stock photo when the company
 * folder has no file of its own (used by slots that only exist as company photography).
 */
function photo(slot: string, file: string, alt: string, stockFile = file, companyPosition?: string): SiteImage {
  const base = file.replace(/\.[^.]+$/, '');
  let src = `/images/${stockFile}`;
  let isCompanyPhoto = false;
  for (const ext of EXTENSIONS) {
    if (COMPANY_FILES.has(`${base}${ext}`)) {
      src = `/images/company/${base}${ext}`;
      isCompanyPhoto = true;
      break;
    }
  }
  return {
    src,
    alt: ALT_OVERRIDES[slot] ?? alt,
    ...(isCompanyPhoto && companyPosition ? { position: companyPosition } : {}),
  };
}

export const SITE_IMAGES = {
  /** Home page hero. Landscape — replace with `company/home-hero.jpg`; falls back to the stock team photo. */
  homeHero: photo(
    'homeHero',
    'home-hero.jpg',
    'A whiteboard at Asva Innovation Lab headed “ASVA Innovation Lab Pvt Ltd.”, with the team’s approach written as JavaScript: a developer object whose mindset is “Never Give Up”, passion is “Coding” and goal is “Build The Future”, working in a loop of learn, code, innovate and improve.',
    'team-collab.jpg',
  ),
  teamCollab: photo('teamCollab', 'team-collab.jpg', 'A software team working together on laptops around a table'),
  teamReview: photo('teamReview', 'team-review.jpg', 'Two colleagues reviewing code together at a desk'),
  qaTesting: photo('qaTesting', 'qa1.jpg', 'A quality assurance team at work in the Asva Innovation Lab office: one colleague on a phone call while two others work at their desks'),
  workspace: photo('workspace', 'workspace.jpg', 'Overhead view of a team workspace with laptops and phones'),
  webDev: photo('webDev', 'web-dev.jpg', 'Laptop showing source code on a developer’s desk'),
  webDesign: photo('webDesign', 'webdesign.jpg', 'Desktop monitor displaying a website layout next to a code editor'),
  // Keep head, headphones and laptops framed cleanly across 4:3, 16:10 and 16:9 containers.
  /** Company photo is a portrait shot of a developer at a desk; framed slightly below centre so the face and laptop survive the landscape crop. */
  customSoftware: photo('customSoftware', 'custom-software.jpg', 'A team planning a project around sticky notes on a whiteboard', 'custom-software.jpg', '50% 55%'),
  webApp: photo('webApp', 'web-app-dev.jpg', 'A developer workstation at Asva Innovation Lab: a laptop open on application code beside an external monitor and a backlit mechanical keyboard'),
  mobileApp: photo('mobileApp', 'mobileapp.jpg', 'Smartphone showing a home screen of mobile apps'),
  analytics: photo('analytics', 'analytics.jpg', 'Analytics dashboard with charts on a laptop screen'),
  cloud: photo('cloud', 'cloud-network.webp', 'Earth at night with glowing city lights connected across the globe'),
  ai: photo('ai', 'ai.webp', 'A sheet of paper reading "Artificial Intelligence" rolled into a typewriter'),
  uiux: photo('uiux', 'uiux.webp', 'A hand sketching app wireframes on a tablet with a stylus'),
  ecommerce: photo('ecommerce', 'ecommerce.jpg', 'A hand holding a payment card in front of an open laptop at Asva Innovation Lab, ready to pay for an online order', 'ecommerce.jpg', 'center 42%'),
  integration: photo('integration', 'integration.jpg', 'A laptop on a stand at Asva Innovation Lab connected through a USB-C hub, linking several devices into one system', 'integration.jpg', 'center 35%'),
  // Keep enterprise dashboard monitor and workstation framed cleanly across containers.
  enterprise: photo('enterprise', 'enterprise.webp', 'An enterprise software dashboard displayed on a monitor at Asva Innovation Lab', 'enterprise.webp', '50% 50%'),
  itConsulting: photo('itConsulting', 'it-consulting.webp', 'The Asva Innovation Lab consulting team at work: a colleague on a phone call while others work at their desks'),
  teamCareers: photo('teamCareers', 'team-careers.jpg', 'A training session at Asva Innovation Lab: team members at laptops around a long desk while a colleague works through a diagram on the whiteboard'),
} satisfies Record<string, SiteImage>;

const SERVICE_FALLBACKS = [SITE_IMAGES.webDev, SITE_IMAGES.mobileApp, SITE_IMAGES.analytics, SITE_IMAGES.cloud, SITE_IMAGES.ai, SITE_IMAGES.teamReview];

/** Ch  ecked in order — more specific services (e.g. "Website Design") must be matched before the generic web/software catch-all. */
const SERVICE_KEYWORDS: [RegExp, SiteImage][] = [
  [/mobile|android|ios|app\b/i, SITE_IMAGES.mobileApp],
  [/\bai\b|machine|intelligen|automation/i, SITE_IMAGES.ai],
  [/\bux\b|\bui\b.*design|design.*\bui\b/i, SITE_IMAGES.uiux],
  [/\bwebsite\b/i, SITE_IMAGES.webDesign],
  [/e-?commerce|shop|checkout|cart/i, SITE_IMAGES.ecommerce],
  [/\bapi\b|integrat/i, SITE_IMAGES.integration],
  [/cloud|devops|hosting|infrastructure|deploy/i, SITE_IMAGES.cloud],
  [/data|analytic|dashboard|report|bi\b/i, SITE_IMAGES.analytics],
  [/\btest|\bqa\b|quality assurance/i, SITE_IMAGES.qaTesting],
  [/consult|strategy/i, SITE_IMAGES.itConsulting],
  [/enterprise/i, SITE_IMAGES.enterprise],
  [/\bcustom\b/i, SITE_IMAGES.customSoftware],
  [/\bweb\b.*\bapp/i, SITE_IMAGES.webApp],
  [/web|software|custom/i, SITE_IMAGES.webDev],
];

/** Picks a relevant photo for a service from its name or slug, falling back to a stable choice by position. */
export function serviceImage(service: { name: string; slug: string }, index = 0) {
  const text = `${service.name} ${service.slug}`;
  return SERVICE_KEYWORDS.find(([re]) => re.test(text))?.[1] ?? SERVICE_FALLBACKS[index % SERVICE_FALLBACKS.length]!;
}
