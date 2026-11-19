import type { PaginationMeta, SettingsValues } from '@asva/shared';

export interface Media {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  mimeType: string;
}

export type PublicSettings = Omit<SettingsValues, 'notifications'> & {
  media: {
    logoForDarkBg: Media | null;
    logoForLightBg: Media | null;
    logoIcon: Media | null;
    favicon: Media | null;
    ogImage: Media | null;
    heroImage: Media | null;
  };
};

export interface NavItem {
  id: string;
  label: string;
  href: string;
  isExternal: boolean;
  openInNewTab: boolean;
}

export type Navigation = Record<'HEADER' | 'FOOTER_QUICK_LINKS' | 'FOOTER_LEGAL', NavItem[]>;

export interface TechnologyRef {
  id: string;
  name: string;
  slug: string;
  category?: string;
  logo?: Media | null;
  websiteUrl?: string | null;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  icon: string | null;
  coverImage: Media | null;
  features: string[];
  technologies: TechnologyRef[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
  related?: Pick<Service, 'id' | 'name' | 'slug' | 'shortDescription' | 'icon'>[];
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  noIndex: boolean;
  publishedAt: string | null;
  updatedAt: string;
  featuredImage: Media | null;
}

export interface Testimonial {
  id: string;
  clientName: string;
  designation: string | null;
  company: string | null;
  content: string;
  rating: number | null;
  isFeatured: boolean;
  avatar: Media | null;
}

export interface FaqGroup {
  id: string;
  name: string;
  slug: string;
  faqs: { id: string; question: string; answer: string }[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  linkedinUrl: string | null;
  photo: Media | null;
}

export interface JobSummary {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
  workplaceType: 'ONSITE' | 'HYBRID' | 'REMOTE';
  summary: string;
  deadline: string | null;
  publishedAt: string | null;
}

export interface Job extends JobSummary {
  description: string;
  salaryRange: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

export interface Paged<T> {
  data: T[];
  meta: PaginationMeta;
}
