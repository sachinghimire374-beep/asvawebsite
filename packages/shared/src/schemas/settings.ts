import { z } from 'zod';
import {
  emailSchema,
  optionalHttpUrl,
  optionalMediaId,
  optionalText,
  requiredText,
  safeHrefSchema,
} from './common.js';

const cta = z.object({ label: requiredText(40, 'Button label'), href: safeHrefSchema });
const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #3B82F6');

const iconName = z.string().trim().max(60).default('Sparkles');

export const generalSettingsSchema = z.object({
  companyName: requiredText(120, 'Company name'),
  shortName: requiredText(40, 'Short name'),
  tagline: optionalText(160),
  description: requiredText(500, 'Description'),
  positioning: optionalText(500),
  city: optionalText(80),
  country: optionalText(80),
});

export const brandingSettingsSchema = z.object({
  /** Uploaded overrides; when empty the bundled SVG logo files are used. */
  logoForDarkBgId: optionalMediaId,
  logoForLightBgId: optionalMediaId,
  logoIconId: optionalMediaId,
  faviconId: optionalMediaId,
  ogImageId: optionalMediaId,
  primaryColor: hexColor.default('#3B82F6'),
  accentColor: hexColor.default('#06B6D4'),
});

/** Allow only Google Maps / OpenStreetMap embeds to keep the iframe source trustworthy. */
const mapEmbedUrl = optionalHttpUrl.refine((v) => {
  if (!v) return true;
  const host = new URL(v).hostname;
  return (
    (host === 'www.google.com' && new URL(v).pathname.startsWith('/maps/embed')) ||
    host === 'www.openstreetmap.org'
  );
}, 'Use a Google Maps "Embed a map" URL or an OpenStreetMap embed URL');

export const contactSettingsSchema = z.object({
  email: emailSchema.nullish().or(z.literal('')).transform((v) => v || null),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  addressLine: optionalText(200),
  city: optionalText(80),
  country: optionalText(80),
  mapEmbedUrl,
  businessHours: z
    .array(z.object({ label: requiredText(60, 'Label'), hours: requiredText(60, 'Hours') }))
    .max(10)
    .default([]),
});

export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'github', 'tiktok', 'other'] as const;

export const socialSettingsSchema = z.object({
  links: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        label: requiredText(40, 'Label'),
        url: z.string().trim().url('Enter a full https:// URL').refine((v) => v.startsWith('https://'), 'Use https://'),
      }),
    )
    .max(12)
    .default([]),
});

export const seoSettingsSchema = z.object({
  defaultTitle: requiredText(70, 'Default title'),
  titleTemplate: requiredText(70, 'Title template').refine((v) => v.includes('%s'), 'Include %s where the page title goes'),
  defaultDescription: requiredText(170, 'Default description'),
  searchConsoleVerification: optionalText(100),
});

export const analyticsSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  ga4MeasurementId: optionalText(20).refine((v) => !v || /^G-[A-Z0-9]{4,15}$/.test(v), 'GA4 IDs look like G-XXXXXXXXXX'),
  gtmContainerId: optionalText(20).refine((v) => !v || /^GTM-[A-Z0-9]{4,10}$/.test(v), 'GTM IDs look like GTM-XXXXXXX'),
});

export const cookieSettingsSchema = z.object({
  bannerEnabled: z.boolean().default(true),
  message: requiredText(400, 'Message'),
  policyHref: safeHrefSchema.default('/cookie-policy'),
});

export const maintenanceSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  message: requiredText(400, 'Message'),
});

export const homeSettingsSchema = z.object({
  hero: z.object({
    eyebrow: optionalText(80),
    headline: requiredText(140, 'Headline'),
    subheadline: requiredText(400, 'Supporting text'),
    primaryCta: cta,
    secondaryCta: cta,
    imageId: optionalMediaId,
  }),
  intro: z.object({
    eyebrow: optionalText(60),
    heading: requiredText(160, 'Heading'),
    body: requiredText(2000, 'Body'),
    cta,
  }),
  services: z.object({
    heading: requiredText(140, 'Heading'),
    subheading: optionalText(400),
    limit: z.coerce.number().int().min(3).max(12).default(6),
  }),
  whyChooseUs: z.object({
    enabled: z.boolean().default(true),
    heading: requiredText(140, 'Heading'),
    subheading: optionalText(400),
    items: z
      .array(z.object({ title: requiredText(80, 'Title'), description: requiredText(300, 'Description'), icon: iconName }))
      .max(12)
      .default([]),
  }),
  process: z.object({
    enabled: z.boolean().default(true),
    heading: requiredText(140, 'Heading'),
    subheading: optionalText(400),
    steps: z
      .array(z.object({ title: requiredText(80, 'Title'), description: requiredText(400, 'Description') }))
      .max(12)
      .default([]),
  }),
  technologies: z.object({
    enabled: z.boolean().default(true),
    heading: requiredText(140, 'Heading'),
    subheading: optionalText(400),
  }),
  testimonials: z.object({
    heading: requiredText(140, 'Heading'),
    subheading: optionalText(400),
  }),
  cta: z.object({
    heading: requiredText(140, 'Heading'),
    body: requiredText(400, 'Body'),
    button: cta,
  }),
});

export const aboutSettingsSchema = z.object({
  heading: requiredText(140, 'Heading'),
  intro: requiredText(3000, 'Introduction'),
  mission: requiredText(1000, 'Mission'),
  vision: requiredText(1000, 'Vision'),
  values: z
    .array(z.object({ title: requiredText(60, 'Title'), description: requiredText(300, 'Description'), icon: iconName }))
    .max(12)
    .default([]),
  approachHeading: requiredText(140, 'Heading'),
  approach: requiredText(3000, 'Approach'),
  showTeam: z.boolean().default(true),
  timeline: z
    .array(z.object({ year: requiredText(10, 'Year'), title: requiredText(100, 'Title'), description: optionalText(400) }))
    .max(40)
    .default([]),
});

export const footerSettingsSchema = z.object({
  description: requiredText(400, 'Description'),
  newsletterEnabled: z.boolean().default(true),
  newsletterHeading: requiredText(80, 'Heading'),
  newsletterBody: optionalText(200),
  copyrightName: requiredText(120, 'Copyright name'),
});

export const careersSettingsSchema = z.object({
  intro: requiredText(1000, 'Introduction'),
  acceptGeneralApplications: z.boolean().default(true),
  noVacanciesMessage: requiredText(400, 'Message'),
});

/** Private: never returned by the public settings endpoint. */
export const notificationSettingsSchema = z.object({
  leadRecipients: z.array(emailSchema).max(10).default([]),
  contactRecipients: z.array(emailSchema).max(10).default([]),
  careersRecipients: z.array(emailSchema).max(10).default([]),
  sendSubmitterConfirmations: z.boolean().default(true),
});

export const SETTINGS_SCHEMAS = {
  general: generalSettingsSchema,
  branding: brandingSettingsSchema,
  contact: contactSettingsSchema,
  social: socialSettingsSchema,
  seo: seoSettingsSchema,
  analytics: analyticsSettingsSchema,
  cookies: cookieSettingsSchema,
  maintenance: maintenanceSettingsSchema,
  home: homeSettingsSchema,
  about: aboutSettingsSchema,
  footer: footerSettingsSchema,
  careers: careersSettingsSchema,
  notifications: notificationSettingsSchema,
} as const;

export type SettingsGroup = keyof typeof SETTINGS_SCHEMAS;
export const SETTINGS_GROUPS = Object.keys(SETTINGS_SCHEMAS) as SettingsGroup[];
export const PRIVATE_SETTINGS_GROUPS: SettingsGroup[] = ['notifications'];

export type SettingsValues = { [K in SettingsGroup]: z.output<(typeof SETTINGS_SCHEMAS)[K]> };

export const settingsUpdateSchema = z.object({
  group: z.enum(SETTINGS_GROUPS as [SettingsGroup, ...SettingsGroup[]]),
  value: z.unknown(),
});
