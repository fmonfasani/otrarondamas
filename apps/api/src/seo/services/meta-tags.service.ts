/**
 * MetaTagsService
 * Generates SEO meta tags, OG tags, and JSON-LD structured data
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  MetaTagsDto,
  OgTagsDto,
  TwitterTagsDto,
  ProductSchemaDto,
  BreadcrumbSchemaDto,
  OrganizationSchemaDto,
} from '../dto/meta-tags.dto';
import { seoConfig } from '../seo.config';

@Injectable()
export class MetaTagsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate meta tags for a product page
   */
  async getProductMetaTags(productId: string, empresaId: string): Promise<MetaTagsDto> {
    const product = await this.prisma.producto.findUnique({
      where: { id: productId },
      include: {
        Familia: true,
        Subfamilia: true,
      },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const url = `${seoConfig.baseUrl}/productos/${product.id}`;
    const image = await this.getProductImage(product.id);

    return {
      title: `${product.nombre} | ${seoConfig.siteName}`,
      description: `${product.nombre} - ${product.marca || seoConfig.siteName}. Precio: $${product.precioMinorista.toLocaleString()}`,
      image: image || seoConfig.defaultImage,
      url,
      canonical: url,
      keywords: [
        product.nombre,
        product.marca,
        product.Familia?.nombre,
        product.Subfamilia?.nombre,
      ].filter(Boolean),
      author: seoConfig.author,
      locale: seoConfig.defaultLocale,
      type: 'product',
      twitterCard: 'summary_large_image',
      twitterHandle: seoConfig.twitterHandle,
      ogPrice: {
        amount: product.precioMinorista.toString(),
        currency: seoConfig.currency,
      },
      ogAvailability: product.activo ? 'InStock' : 'OutOfStock',
    };
  }

  /**
   * Generate meta tags for home page
   */
  async getHomeMetaTags(empresaId: string): Promise<MetaTagsDto> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      throw new Error(`Empresa ${empresaId} not found`);
    }

    const url = seoConfig.baseUrl;

    return {
      title: `${empresa.nombre} | ${seoConfig.siteName}`,
      description: `${empresa.nombre} - Solución integral de comercio electrónico y punto de venta`,
      image: seoConfig.defaultImage,
      url,
      canonical: url,
      keywords: seoConfig.keywords,
      author: seoConfig.author,
      locale: seoConfig.defaultLocale,
      type: 'website',
      twitterCard: 'summary_large_image',
      twitterHandle: seoConfig.twitterHandle,
    };
  }

  /**
   * Generate meta tags for category page
   */
  async getCategoryMetaTags(categoryId: string, empresaId: string): Promise<MetaTagsDto> {
    const categoria = await this.prisma.familia.findUnique({
      where: { id: categoryId },
    });

    if (!categoria) {
      throw new Error(`Category ${categoryId} not found`);
    }

    const url = `${seoConfig.baseUrl}/categorias/${categoria.id}`;
    const productCount = await this.prisma.producto.count({
      where: { familiaId: categoryId, empresaId },
    });

    return {
      title: `${categoria.nombre} | ${seoConfig.siteName}`,
      description: `${categoria.nombre} - ${productCount} productos disponibles en ${seoConfig.siteName}`,
      image: seoConfig.defaultImage,
      url,
      canonical: url,
      keywords: [categoria.nombre, ...seoConfig.keywords],
      author: seoConfig.author,
      locale: seoConfig.defaultLocale,
      type: 'website',
      twitterCard: 'summary_large_image',
      twitterHandle: seoConfig.twitterHandle,
    };
  }

  /**
   * Generate OG tags for product
   */
  async getProductOgTags(productId: string, empresaId: string): Promise<OgTagsDto> {
    const product = await this.prisma.producto.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const image = await this.getProductImage(product.id);

    return {
      title: product.nombre,
      description: `${product.nombre} - ${product.marca || seoConfig.siteName}`,
      type: 'product',
      url: `${seoConfig.baseUrl}/productos/${product.id}`,
      image: image || seoConfig.defaultImage,
      imageWidth: '1200',
      imageHeight: '630',
      imageType: 'image/jpeg',
      locale: seoConfig.defaultLocale,
      siteName: seoConfig.siteName,
      price: {
        amount: product.precioMinorista.toString(),
        currency: seoConfig.currency,
      },
      availability: product.activo ? 'InStock' : 'OutOfStock',
    };
  }

  /**
   * Generate Twitter tags for product
   */
  async getProductTwitterTags(productId: string, empresaId: string): Promise<TwitterTagsDto> {
    const product = await this.prisma.producto.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const image = await this.getProductImage(product.id);

    return {
      card: 'summary_large_image',
      title: product.nombre,
      description: `${product.nombre} - ${product.marca || seoConfig.siteName}`,
      image: image || seoConfig.defaultImage,
      creator: seoConfig.twitterHandle,
      site: seoConfig.twitterHandle,
    };
  }

  /**
   * Generate JSON-LD Product schema
   */
  async getProductSchema(productId: string, empresaId: string): Promise<ProductSchemaDto> {
    const product = await this.prisma.producto.findUnique({
      where: { id: productId },
      include: {
        Familia: true,
      },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const image = await this.getProductImage(product.id);

    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.nombre,
      description: `${product.nombre} - ${product.marca || 'Producto'}`,
      image: image || seoConfig.defaultImage,
      sku: product.codigoBarras || product.codigoInterno,
      brand: product.marca
        ? {
            '@type': 'Brand',
            name: product.marca,
          }
        : undefined,
      offers: {
        '@type': 'Offer',
        url: `${seoConfig.baseUrl}/productos/${product.id}`,
        priceCurrency: seoConfig.currency,
        price: product.precioMinorista.toString(),
        availability: product.activo ? 'InStock' : 'OutOfStock',
      },
    };
  }

  /**
   * Generate JSON-LD Breadcrumb schema
   */
  getBreadcrumbSchema(path: string): BreadcrumbSchemaDto {
    const segments = path.split('/').filter(Boolean);
    const itemListElement = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: seoConfig.baseUrl,
      },
    ];

    let currentPath = seoConfig.baseUrl;
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      itemListElement.push({
        '@type': 'ListItem',
        position: index + 2,
        name: this.formatBreadcrumbName(segment),
        item: currentPath,
      });
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement,
    };
  }

  /**
   * Generate JSON-LD Organization schema
   */
  async getOrganizationSchema(empresaId: string): Promise<OrganizationSchemaDto> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      throw new Error(`Empresa ${empresaId} not found`);
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: empresa.nombre,
      url: seoConfig.baseUrl,
      logo: seoConfig.defaultImage,
      description: `Tienda online de ${empresa.nombre}`,
      sameAs: seoConfig.twitterHandle
        ? [`https://twitter.com/${seoConfig.twitterHandle.replace('@', '')}`]
        : undefined,
    };
  }

  /**
   * Format breadcrumb name from URL segment
   */
  private formatBreadcrumbName(segment: string): string {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get product image from Asset or return default
   */
  private async getProductImage(productId: string): Promise<string | null> {
    try {
      // This would typically be implemented with actual asset lookup
      // For now, returning null to use defaultImage
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate HTML meta tags string for insertion into response
   */
  formatHtmlMetaTags(metaTags: MetaTagsDto): string {
    let html = '';

    html += `<meta charset="utf-8">\n`;
    html += `<meta name="viewport" content="width=device-width, initial-scale=1">\n`;
    html += `<title>${this.escapeHtml(metaTags.title)}</title>\n`;
    html += `<meta name="description" content="${this.escapeHtml(metaTags.description)}">\n`;

    if (metaTags.keywords && metaTags.keywords.length) {
      html += `<meta name="keywords" content="${this.escapeHtml(metaTags.keywords.join(', '))}">\n`;
    }

    if (metaTags.author) {
      html += `<meta name="author" content="${this.escapeHtml(metaTags.author)}">\n`;
    }

    if (metaTags.canonical) {
      html += `<link rel="canonical" href="${metaTags.canonical}">\n`;
    }

    if (metaTags.locale) {
      html += `<meta property="og:locale" content="${metaTags.locale}">\n`;
    }

    // Open Graph tags
    html += `<meta property="og:title" content="${this.escapeHtml(metaTags.title)}">\n`;
    html += `<meta property="og:description" content="${this.escapeHtml(metaTags.description)}">\n`;
    html += `<meta property="og:type" content="${metaTags.type || 'website'}">\n`;
    html += `<meta property="og:url" content="${metaTags.url}">\n`;

    if (metaTags.image) {
      html += `<meta property="og:image" content="${metaTags.image}">\n`;
    }

    if (metaTags.ogPrice) {
      html += `<meta property="og:price:amount" content="${metaTags.ogPrice.amount}">\n`;
      html += `<meta property="og:price:currency" content="${metaTags.ogPrice.currency}">\n`;
    }

    if (metaTags.ogAvailability) {
      html += `<meta property="og:availability" content="${metaTags.ogAvailability}">\n`;
    }

    // Twitter tags
    if (metaTags.twitterCard) {
      html += `<meta name="twitter:card" content="${metaTags.twitterCard}">\n`;
      html += `<meta name="twitter:title" content="${this.escapeHtml(metaTags.title)}">\n`;
      html += `<meta name="twitter:description" content="${this.escapeHtml(metaTags.description)}">\n`;

      if (metaTags.image) {
        html += `<meta name="twitter:image" content="${metaTags.image}">\n`;
      }

      if (metaTags.twitterHandle) {
        html += `<meta name="twitter:creator" content="${metaTags.twitterHandle}">\n`;
      }
    }

    if (metaTags.robots) {
      html += `<meta name="robots" content="${metaTags.robots}">\n`;
    }

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate JSON-LD schema as HTML script tag
   */
  formatJsonLdScript(schema: any): string {
    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n`;
  }
}
