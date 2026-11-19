import type { Metadata } from 'next';
import type { PublicSettings } from './types';
import { absoluteUrl } from './utils';

interface MetaInput {
  title?: string | null;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  noIndex?: boolean;
}

/** Consistent metadata for every public route: canonical URL, Open Graph and Twitter cards. */
export function buildMetadata(settings: PublicSettings, input: MetaInput): Metadata {
  const description = input.description || settings.seo.defaultDescription;
  const image = input.image ?? settings.media.ogImage?.url ?? '/opengraph-image';
  const imageUrl = image.startsWith('http') ? image : absoluteUrl(image);
  const fullTitle = input.title ? settings.seo.titleTemplate.replace('%s', input.title) : settings.seo.defaultTitle;
  return {
    title: input.title ? { absolute: fullTitle } : { absolute: settings.seo.defaultTitle },
    description,
    alternates: { canonical: absoluteUrl(input.path) },
    openGraph: {
      type: input.type ?? 'website',
      url: absoluteUrl(input.path),
      siteName: settings.general.shortName,
      title: fullTitle,
      description,
      locale: 'en_US',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: input.title ?? settings.general.companyName }],
      ...(input.type === 'article' ? { publishedTime: input.publishedTime ?? undefined, modifiedTime: input.modifiedTime ?? undefined } : {}),
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [imageUrl] },
    robots: input.noIndex ? { index: false, follow: true } : undefined,
  };
}

export function organizationJsonLd(settings: PublicSettings) {
  const { general, contact, social } = settings;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: general.companyName,
    alternateName: general.shortName,
    url: absoluteUrl('/'),
    logo: settings.media.logoForLightBg?.url ? absoluteUrl(settings.media.logoForLightBg.url) : absoluteUrl('/brand/logo-full-dark.svg'),
    description: general.description,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(contact.addressLine ? { streetAddress: contact.addressLine } : {}),
      addressLocality: contact.city ?? general.city ?? undefined,
      addressCountry: 'NP',
    },
    ...(social.links.length ? { sameAs: social.links.map((l) => l.url) } : {}),
  };
}

export function websiteJsonLd(settings: PublicSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.general.shortName,
    url: absoluteUrl('/'),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}
