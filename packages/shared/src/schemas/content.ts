import { z } from 'zod';
import {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  NAVIGATION_MENU_KEYS,
  TECHNOLOGY_CATEGORIES,
  TESTIMONIAL_STATUSES,
  WORKPLACE_TYPES,
} from '../enums.js';
import {
  contentStatusSchema,
  displayOrderSchema,
  idSchema,
  listQuerySchema,
  optionalHref,
  optionalHttpUrl,
  optionalIsoDate,
  optionalMediaId,
  optionalText,
  publicationFields,
  requiredText,
  richTextSchema,
  safeHrefSchema,
  seoFields,
  slugSchema,
} from './common.js';

// ---------- Pages ----------
export const pageInputSchema = z.object({
  title: requiredText(160, 'Title'),
  slug: slugSchema,
  excerpt: optionalText(500),
  content: richTextSchema,
  featuredImageId: optionalMediaId,
  noIndex: z.boolean().default(false),
  revisionNote: optionalText(200).optional(),
  ...seoFields,
  ...publicationFields,
});
export type PageInput = z.input<typeof pageInputSchema>;

// ---------- Services ----------
export const serviceInputSchema = z.object({
  name: requiredText(120, 'Name'),
  slug: slugSchema,
  shortDescription: requiredText(300, 'Short description'),
  description: richTextSchema,
  icon: optionalText(60),
  coverImageId: optionalMediaId,
  features: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  technologyIds: z.array(idSchema).max(50).default([]),
  displayOrder: displayOrderSchema,
  ...seoFields,
  ...publicationFields,
});
export type ServiceInput = z.input<typeof serviceInputSchema>;

// ---------- Technologies ----------
export const technologyInputSchema = z.object({
  name: requiredText(80, 'Name'),
  slug: slugSchema,
  category: z.enum(TECHNOLOGY_CATEGORIES),
  logoId: optionalMediaId,
  websiteUrl: optionalHttpUrl,
  displayOrder: displayOrderSchema,
  isVisible: z.boolean().default(true),
});
export type TechnologyInput = z.input<typeof technologyInputSchema>;

export const adminContentQuerySchema = listQuerySchema.extend({
  status: contentStatusSchema.optional(),
});

// ---------- Testimonials ----------
export const testimonialInputSchema = z.object({
  clientName: requiredText(100, 'Client name'),
  designation: optionalText(100),
  company: optionalText(120),
  content: requiredText(2000, 'Testimonial'),
  avatarId: optionalMediaId,
  rating: z.coerce.number().int().min(1).max(5).nullish().transform((v) => v ?? null),
  status: z.enum(TESTIMONIAL_STATUSES).default('PENDING'),
  permissionConfirmed: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  displayOrder: displayOrderSchema,
});
export type TestimonialInput = z.input<typeof testimonialInputSchema>;

// ---------- FAQs ----------
export const faqCategoryInputSchema = z.object({
  name: requiredText(80, 'Name'),
  slug: slugSchema,
  displayOrder: displayOrderSchema,
});
export type FaqCategoryInput = z.input<typeof faqCategoryInputSchema>;

export const faqInputSchema = z.object({
  question: requiredText(300, 'Question'),
  answer: requiredText(10_000, 'Answer'),
  categoryId: idSchema.nullish().transform((v) => v ?? null),
  isPublished: z.boolean().default(false),
  displayOrder: displayOrderSchema,
});
export type FaqInput = z.input<typeof faqInputSchema>;

// ---------- Team ----------
export const teamMemberInputSchema = z.object({
  name: requiredText(100, 'Name'),
  role: requiredText(100, 'Role'),
  bio: optionalText(800),
  photoId: optionalMediaId,
  linkedinUrl: optionalHttpUrl,
  isVisible: z.boolean().default(true),
  displayOrder: displayOrderSchema,
});
export type TeamMemberInput = z.input<typeof teamMemberInputSchema>;

// ---------- Jobs ----------
export const jobInputSchema = z.object({
  title: requiredText(160, 'Title'),
  slug: slugSchema,
  department: requiredText(80, 'Department'),
  location: requiredText(120, 'Location'),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  workplaceType: z.enum(WORKPLACE_TYPES).default('ONSITE'),
  summary: requiredText(400, 'Summary'),
  description: richTextSchema,
  salaryRange: optionalText(100),
  deadline: optionalIsoDate,
  status: z.enum(JOB_STATUSES).default('DRAFT'),
  ...seoFields,
});
export type JobInput = z.input<typeof jobInputSchema>;

// ---------- Navigation ----------
export const navigationItemInputSchema = z.object({
  menu: z.enum(NAVIGATION_MENU_KEYS),
  label: requiredText(60, 'Label'),
  href: safeHrefSchema,
  openInNewTab: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  displayOrder: displayOrderSchema,
});
export type NavigationItemInput = z.input<typeof navigationItemInputSchema>;

// ---------- Redirects ----------
export const redirectInputSchema = z.object({
  fromPath: z
    .string()
    .trim()
    .max(500)
    .regex(/^\/[A-Za-z0-9\-._~/%]*$/, 'Must be a site path starting with /')
    .refine((v) => !v.startsWith('/admin') && !v.startsWith('/api'), 'System routes cannot be redirected'),
  toPath: safeHrefSchema,
  statusCode: z.coerce.number().pipe(z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)])).default(308),
  isActive: z.boolean().default(true),
});
export type RedirectInput = z.input<typeof redirectInputSchema>;
export type RedirectData = z.output<typeof redirectInputSchema>;

// ---------- Media ----------
export const mediaUpdateSchema = z.object({
  altText: optionalText(250),
  caption: optionalText(500),
  originalName: requiredText(200, 'File name').optional(),
});
export type MediaUpdateInput = z.input<typeof mediaUpdateSchema>;

export const mediaQuerySchema = listQuerySchema.extend({
  type: z.enum(['image', 'document', 'all']).default('all'),
});

export { optionalHref };
