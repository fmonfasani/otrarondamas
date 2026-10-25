/**
 * SEO Meta Tags DTOs
 */

export class MetaTagsDto {
  title: string;
  description: string;
  image?: string;
  url: string;
  canonical?: string;
  keywords?: string[];
  author?: string;
  locale?: string;
  type?: 'website' | 'product' | 'article';
  twitterCard?: 'summary' | 'summary_large_image' | 'player' | 'app';
  twitterHandle?: string;
  robots?: string;
  alternates?: {
    hrefLang?: string;
    hrefLangDefault?: string;
  };
  ogPrice?: {
    amount: string;
    currency: string;
  };
  ogAvailability?: string;
}

export class OgTagsDto {
  title: string;
  description: string;
  type: 'website' | 'product' | 'article';
  url: string;
  image: string;
  imageWidth?: string;
  imageHeight?: string;
  imageType?: string;
  locale?: string;
  siteName?: string;
  price?: {
    amount: string;
    currency: string;
  };
  availability?: string;
}

export class TwitterTagsDto {
  card: 'summary' | 'summary_large_image' | 'player' | 'app';
  title: string;
  description: string;
  image?: string;
  creator?: string;
  site?: string;
}

export class SitemapEntryDto {
  url: string;
  lastmod?: Date;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export class ProductSchemaDto {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  image: string | string[];
  brand?: {
    '@type': string;
    name: string;
  };
  offers: {
    '@type': string;
    url: string;
    priceCurrency: string;
    price: string;
    availability: string;
  };
  aggregateRating?: {
    '@type': string;
    ratingValue: string;
    reviewCount: string;
  };
  sku?: string;
}

export class BreadcrumbSchemaDto {
  '@context': string;
  '@type': string;
  itemListElement: Array<{
    '@type': string;
    position: number;
    name: string;
    item: string;
  }>;
}

export class OrganizationSchemaDto {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs?: string[];
  address?: {
    '@type': string;
    streetAddress?: string;
    addressLocality?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  contactPoint?: {
    '@type': string;
    contactType: string;
    telephone?: string;
    email?: string;
  };
}
