/**
 * SitemapService
 * Generates XML sitemaps for products, categories, and pages
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SitemapEntryDto } from '../dto/meta-tags.dto';
import { seoConfig } from '../seo.config';

@Injectable()
export class SitemapService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate sitemap for products
   */
  async generateProductSitemap(empresaId: string): Promise<string> {
    const products = await this.prisma.producto.findMany({
      where: {
        empresaId,
        activo: true,
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const entries: SitemapEntryDto[] = products.map((product) => ({
      url: `${seoConfig.baseUrl}/productos/${product.id}`,
      lastmod: product.updatedAt,
      changefreq: 'weekly',
      priority: 0.8,
    }));

    return this.generateSitemapXml(entries);
  }

  /**
   * Generate sitemap for categories
   */
  async generateCategorySitemap(empresaId: string): Promise<string> {
    const categories = await this.prisma.familia.findMany({
      where: { empresaId },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    const entries: SitemapEntryDto[] = categories.map((category) => ({
      url: `${seoConfig.baseUrl}/categorias/${category.id}`,
      lastmod: category.updatedAt,
      changefreq: 'weekly',
      priority: 0.7,
    }));

    return this.generateSitemapXml(entries);
  }

  /**
   * Generate sitemap for static pages
   */
  generatePagesSitemap(): string {
    const entries: SitemapEntryDto[] = [
      {
        url: seoConfig.baseUrl,
        changefreq: 'daily',
        priority: 1.0,
      },
      {
        url: `${seoConfig.baseUrl}/productos`,
        changefreq: 'daily',
        priority: 0.9,
      },
      {
        url: `${seoConfig.baseUrl}/categorias`,
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        url: `${seoConfig.baseUrl}/acerca-de`,
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        url: `${seoConfig.baseUrl}/contacto`,
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        url: `${seoConfig.baseUrl}/terminos-servicio`,
        changefreq: 'yearly',
        priority: 0.3,
      },
      {
        url: `${seoConfig.baseUrl}/politica-privacidad`,
        changefreq: 'yearly',
        priority: 0.3,
      },
    ];

    return this.generateSitemapXml(entries);
  }

  /**
   * Generate sitemap index
   */
  async generateSitemapIndex(empresaId: string): Promise<string> {
    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <sitemap>\n`;
    xml += `    <loc>${seoConfig.baseUrl}/sitemap-products.xml</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `  </sitemap>\n`;
    xml += `  <sitemap>\n`;
    xml += `    <loc>${seoConfig.baseUrl}/sitemap-categories.xml</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `  </sitemap>\n`;
    xml += `  <sitemap>\n`;
    xml += `    <loc>${seoConfig.baseUrl}/sitemap-pages.xml</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `  </sitemap>\n`;
    xml += `</sitemapindex>\n`;

    return xml;
  }

  /**
   * Generate robots.txt
   */
  generateRobotsTxt(): string {
    let robotsTxt = '';

    robotsTxt += `User-agent: *\n`;
    robotsTxt += `Allow: /\n`;
    robotsTxt += `Allow: /productos\n`;
    robotsTxt += `Allow: /categorias\n`;
    robotsTxt += `Disallow: /admin\n`;
    robotsTxt += `Disallow: /api\n`;
    robotsTxt += `Disallow: /admin/*\n`;
    robotsTxt += `Disallow: /api/*\n`;
    robotsTxt += `Disallow: /*.pdf\n`;
    robotsTxt += `Disallow: /*.json\n`;
    robotsTxt += `\n`;
    robotsTxt += `Crawl-delay: 1\n`;
    robotsTxt += `Request-rate: 1/1s\n`;
    robotsTxt += `\n`;
    robotsTxt += `Sitemap: ${seoConfig.baseUrl}/sitemap-index.xml\n`;

    return robotsTxt;
  }

  /**
   * Generate .htaccess for Apache servers (optional)
   */
  generateHtaccess(): string {
    let htaccess = '';

    htaccess += `# Enable GZIP compression\n`;
    htaccess += `<IfModule mod_deflate.c>\n`;
    htaccess += `    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript\n`;
    htaccess += `</IfModule>\n`;
    htaccess += `\n`;
    htaccess += `# Browser caching\n`;
    htaccess += `<IfModule mod_expires.c>\n`;
    htaccess += `    ExpiresActive On\n`;
    htaccess += `    ExpiresDefault "access plus 7 days"\n`;
    htaccess += `    ExpiresByType text/html "access plus 1 hour"\n`;
    htaccess += `    ExpiresByType image/jpeg "access plus 1 year"\n`;
    htaccess += `    ExpiresByType image/gif "access plus 1 year"\n`;
    htaccess += `    ExpiresByType image/png "access plus 1 year"\n`;
    htaccess += `    ExpiresByType application/javascript "access plus 1 year"\n`;
    htaccess += `    ExpiresByType text/css "access plus 1 year"\n`;
    htaccess += `</IfModule>\n`;
    htaccess += `\n`;
    htaccess += `# Prevent directory listing\n`;
    htaccess += `Options -Indexes\n`;

    return htaccess;
  }

  /**
   * Generate XML sitemap from entries
   */
  private generateSitemapXml(entries: SitemapEntryDto[]): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const entry of entries) {
      xml += `  <url>\n`;
      xml += `    <loc>${this.escapeSitemapUrl(entry.url)}</loc>\n`;

      if (entry.lastmod) {
        xml += `    <lastmod>${entry.lastmod.toISOString().split('T')[0]}</lastmod>\n`;
      }

      if (entry.changefreq) {
        xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
      }

      if (entry.priority !== undefined) {
        xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
      }

      xml += `  </url>\n`;
    }

    xml += `</urlset>\n`;

    return xml;
  }

  /**
   * Escape special characters in sitemap URL
   */
  private escapeSitemapUrl(url: string): string {
    return url
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
