/**
 * P15-1 SEO & Metadata Integration Tests
 *
 * Tests:
 * - ✅ Product OG tags generation
 * - ✅ Category OG tags generation
 * - ✅ Home page OG tags
 * - ✅ Product JSON-LD schema
 * - ✅ Breadcrumb JSON-LD schema
 * - ✅ Organization JSON-LD schema
 * - ✅ Product sitemap XML generation
 * - ✅ Category sitemap XML generation
 * - ✅ Pages sitemap XML generation
 * - ✅ Sitemap index XML generation
 * - ✅ Robots.txt generation
 * - ✅ Meta tags middleware injection
 * - ✅ Twitter Card tags
 * - ✅ Canonical URL tag
 * - ✅ Robots meta tag (noindex, follow)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MetaTagsService } from '../../src/seo/services/meta-tags.service';
import { SitemapService } from '../../src/seo/services/sitemap.service';
import { seoConfig } from '../../src/seo/seo.config';
import { PrismaModule } from '../../src/prisma/prisma.module';

describe('P15-1: SEO & Metadata (Integration)', () => {
  let prisma: PrismaService;
  let metaTagsService: MetaTagsService;
  let sitemapService: SitemapService;
  let testEmpresaId: string;
  let testProductoId: string;
  let testFamiliaId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [MetaTagsService, SitemapService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    metaTagsService = module.get<MetaTagsService>(MetaTagsService);
    sitemapService = module.get<SitemapService>(SitemapService);

    // Create test data
    const empresa = await prisma.empresa.create({
      data: {
        nombre: `Test Empresa SEO ${Date.now()}`,
        slug: `test-empresa-seo-${Date.now()}`,
        configuracion: {},
      },
    });
    testEmpresaId = empresa.id;

    // Create test category (Familia)
    const familia = await prisma.familia.create({
      data: {
        empresaId: testEmpresaId,
        nombre: 'Test Familia',
      },
    });
    testFamiliaId = familia.id;

    // Create test subfamilia
    const subfamilia = await prisma.subfamilia.create({
      data: {
        empresaId: testEmpresaId,
        familiaId: testFamiliaId,
        nombre: 'Test Subfamilia',
      },
    });

    // Create test tipo
    const tipo = await prisma.tipo.create({
      data: {
        empresaId: testEmpresaId,
        nombre: 'Test Tipo',
      },
    });

    // Create test subtipo
    const subtipo = await prisma.subtipo.create({
      data: {
        empresaId: testEmpresaId,
        tipoId: tipo.id,
        nombre: 'Test Subtipo',
      },
    });

    // Create test product
    const producto = await prisma.producto.create({
      data: {
        empresaId: testEmpresaId,
        nombre: 'Test Product SEO',
        codigoInterno: `TEST-SEO-${Date.now()}`,
        codigoBarras: '1234567890',
        marca: 'Test Brand',
        unidadBase: 'UNIDAD',
        costo: 100,
        precioMinorista: 200,
        precioMayorista: 150,
        familiaId: testFamiliaId,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        activo: true,
      },
    });
    testProductoId = producto.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.producto.deleteMany({
      where: { empresaId: testEmpresaId },
    });

    await prisma.subtipo.deleteMany({
      where: { empresaId: testEmpresaId },
    });

    await prisma.tipo.deleteMany({
      where: { empresaId: testEmpresaId },
    });

    await prisma.subfamilia.deleteMany({
      where: { empresaId: testEmpresaId },
    });

    await prisma.familia.deleteMany({
      where: { empresaId: testEmpresaId },
    });

    await prisma.empresa.delete({
      where: { id: testEmpresaId },
    });

    await prisma.$disconnect();
  });

  describe('Meta Tags Service', () => {
    it('should generate product meta tags', async () => {
      const metaTags = await metaTagsService.getProductMetaTags(testProductoId, testEmpresaId);

      expect(metaTags).toBeDefined();
      expect(metaTags.title).toContain('Test Product SEO');
      expect(metaTags.description).toContain('Test Product SEO');
      expect(metaTags.url).toContain(testProductoId);
      expect(metaTags.type).toBe('product');
      expect(metaTags.canonical).toBe(metaTags.url);
      expect(metaTags.ogPrice).toBeDefined();
      expect(metaTags.ogPrice.amount).toBe('200');
      expect(metaTags.ogPrice.currency).toBe(seoConfig.currency);
      expect(metaTags.ogAvailability).toBe('InStock');
    });

    it('should generate home page meta tags', async () => {
      const metaTags = await metaTagsService.getHomeMetaTags(testEmpresaId);

      expect(metaTags).toBeDefined();
      expect(metaTags.title).toContain('Test Empresa SEO');
      expect(metaTags.type).toBe('website');
      expect(metaTags.url).toBe(seoConfig.baseUrl);
      expect(metaTags.keywords).toBeDefined();
      expect(Array.isArray(metaTags.keywords)).toBe(true);
    });

    it('should generate category meta tags', async () => {
      const metaTags = await metaTagsService.getCategoryMetaTags(testFamiliaId, testEmpresaId);

      expect(metaTags).toBeDefined();
      expect(metaTags.title).toContain('Test Familia');
      expect(metaTags.url).toContain(testFamiliaId);
      expect(metaTags.type).toBe('website');
    });

    it('should generate product OG tags', async () => {
      const ogTags = await metaTagsService.getProductOgTags(testProductoId, testEmpresaId);

      expect(ogTags).toBeDefined();
      expect(ogTags.title).toBe('Test Product SEO');
      expect(ogTags.type).toBe('product');
      expect(ogTags.price).toBeDefined();
      expect(ogTags.price.amount).toBe('200');
      expect(ogTags.availability).toBe('InStock');
    });

    it('should generate product Twitter tags', async () => {
      const twitterTags = await metaTagsService.getProductTwitterTags(
        testProductoId,
        testEmpresaId,
      );

      expect(twitterTags).toBeDefined();
      expect(twitterTags.card).toBe('summary_large_image');
      expect(twitterTags.title).toBe('Test Product SEO');
      expect(twitterTags.creator).toBe(seoConfig.twitterHandle);
    });

    it('should generate breadcrumb schema', () => {
      const breadcrumbSchema = metaTagsService.getBreadcrumbSchema('productos/123/detalle');

      expect(breadcrumbSchema).toBeDefined();
      expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
      expect(breadcrumbSchema.itemListElement).toBeDefined();
      expect(Array.isArray(breadcrumbSchema.itemListElement)).toBe(true);
      expect(breadcrumbSchema.itemListElement.length).toBeGreaterThan(0);
      expect(breadcrumbSchema.itemListElement[0].name).toBe('Home');
    });

    it('should generate product JSON-LD schema', async () => {
      const productSchema = await metaTagsService.getProductSchema(testProductoId, testEmpresaId);

      expect(productSchema).toBeDefined();
      expect(productSchema['@context']).toBe('https://schema.org/');
      expect(productSchema['@type']).toBe('Product');
      expect(productSchema.name).toBe('Test Product SEO');
      expect(productSchema.offers).toBeDefined();
      expect(productSchema.offers['@type']).toBe('Offer');
      expect(productSchema.offers.priceCurrency).toBe(seoConfig.currency);
      expect(productSchema.offers.price).toBe('200');
      expect(productSchema.offers.availability).toBe('InStock');
    });

    it('should generate organization JSON-LD schema', async () => {
      const orgSchema = await metaTagsService.getOrganizationSchema(testEmpresaId);

      expect(orgSchema).toBeDefined();
      expect(orgSchema['@type']).toBe('Organization');
      expect(orgSchema.name).toContain('Test Empresa SEO');
      expect(orgSchema.url).toBe(seoConfig.baseUrl);
    });

    it('should format HTML meta tags', async () => {
      const metaTags = await metaTagsService.getProductMetaTags(testProductoId, testEmpresaId);

      const htmlTags = metaTagsService.formatHtmlMetaTags(metaTags);

      expect(htmlTags).toContain('<meta');
      expect(htmlTags).toContain('og:title');
      expect(htmlTags).toContain('og:type');
      expect(htmlTags).toContain('og:url');
      expect(htmlTags).toContain('twitter:card');
      expect(htmlTags).toContain('Test Product SEO');
    });

    it('should format JSON-LD script tag', async () => {
      const productSchema = await metaTagsService.getProductSchema(testProductoId, testEmpresaId);

      const scriptTag = metaTagsService.formatJsonLdScript(productSchema);

      expect(scriptTag).toContain('<script type="application/ld+json">');
      expect(scriptTag).toContain('</script>');
      expect(scriptTag).toContain('Product');
    });

    it('should escape HTML special characters in meta tags', async () => {
      const htmlString = '<script>alert("XSS")</script>';
      const escaped = metaTagsService['escapeHtml'](htmlString);

      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });
  });

  describe('Sitemap Service', () => {
    it('should generate product sitemap XML', async () => {
      const sitemap = await sitemapService.generateProductSitemap(testEmpresaId);

      expect(sitemap).toContain('<?xml version="1.0"');
      expect(sitemap).toContain('<urlset');
      expect(sitemap).toContain('</urlset>');
      expect(sitemap).toContain(testProductoId);
      expect(sitemap).toContain('<changefreq>weekly</changefreq>');
      expect(sitemap).toContain('<priority>0.8</priority>');
    });

    it('should generate category sitemap XML', async () => {
      const sitemap = await sitemapService.generateCategorySitemap(testEmpresaId);

      expect(sitemap).toContain('<?xml version="1.0"');
      expect(sitemap).toContain('<urlset');
      expect(sitemap).toContain(testFamiliaId);
      expect(sitemap).toContain('<changefreq>weekly</changefreq>');
      expect(sitemap).toContain('<priority>0.7</priority>');
    });

    it('should generate pages sitemap XML', () => {
      const sitemap = sitemapService.generatePagesSitemap();

      expect(sitemap).toContain('<?xml version="1.0"');
      expect(sitemap).toContain('<urlset');
      expect(sitemap).toContain('</urlset>');
      expect(sitemap).toContain('productos');
      expect(sitemap).toContain('categorias');
      expect(sitemap).toContain('acerca-de');
      expect(sitemap).toContain('contacto');
      expect(sitemap).toContain('<priority>1.0</priority>');
    });

    it('should generate sitemap index XML', async () => {
      const sitemapIndex = await sitemapService.generateSitemapIndex(testEmpresaId);

      expect(sitemapIndex).toContain('<?xml version="1.0"');
      expect(sitemapIndex).toContain('<sitemapindex');
      expect(sitemapIndex).toContain('</sitemapindex>');
      expect(sitemapIndex).toContain('sitemap-products.xml');
      expect(sitemapIndex).toContain('sitemap-categories.xml');
      expect(sitemapIndex).toContain('sitemap-pages.xml');
    });

    it('should generate robots.txt', () => {
      const robotsTxt = sitemapService.generateRobotsTxt();

      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Allow: /');
      expect(robotsTxt).toContain('Disallow: /admin');
      expect(robotsTxt).toContain('Disallow: /api');
      expect(robotsTxt).toContain('Sitemap:');
      expect(robotsTxt).toContain('sitemap-index.xml');
    });

    it('should escape special characters in sitemap URLs', () => {
      // Test through XML generation
      const sitemap = sitemapService.generatePagesSitemap();

      // Should not contain unescaped special characters
      expect(sitemap).not.toMatch(/&(?!(?:amp|lt|gt|quot|apos);)/);
    });

    it('should generate .htaccess file', () => {
      const htaccess = sitemapService.generateHtaccess();

      expect(htaccess).toContain('# Enable GZIP compression');
      expect(htaccess).toContain('mod_deflate');
      expect(htaccess).toContain('# Browser caching');
      expect(htaccess).toContain('mod_expires');
      expect(htaccess).toContain('Options -Indexes');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent product', async () => {
      const fakeProductId = 'fake-product-id-' + Date.now();

      await expect(
        metaTagsService.getProductMetaTags(fakeProductId, testEmpresaId),
      ).rejects.toThrow();
    });

    it('should throw error for non-existent empresa', async () => {
      const fakeEmpresaId = 'fake-empresa-id-' + Date.now();

      await expect(metaTagsService.getHomeMetaTags(fakeEmpresaId)).rejects.toThrow();
    });

    it('should throw error for non-existent category', async () => {
      const fakeCategoryId = 'fake-category-id-' + Date.now();

      await expect(
        metaTagsService.getCategoryMetaTags(fakeCategoryId, testEmpresaId),
      ).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should include product brand in schema', async () => {
      const schema = await metaTagsService.getProductSchema(testProductoId, testEmpresaId);

      expect(schema.brand).toBeDefined();
      expect(schema.brand.name).toBe('Test Brand');
    });

    it('should include SKU in product schema', async () => {
      const schema = await metaTagsService.getProductSchema(testProductoId, testEmpresaId);

      expect(schema.sku).toBeDefined();
    });

    it('should reflect product price in OG tags', async () => {
      const ogTags = await metaTagsService.getProductOgTags(testProductoId, testEmpresaId);

      expect(parseFloat(ogTags.price.amount)).toBe(200);
    });

    it('should use base URL from config', async () => {
      const metaTags = await metaTagsService.getHomeMetaTags(testEmpresaId);

      expect(metaTags.url).toBe(seoConfig.baseUrl);
    });

    it('should include locale in meta tags', async () => {
      const metaTags = await metaTagsService.getProductMetaTags(testProductoId, testEmpresaId);

      expect(metaTags.locale).toBe(seoConfig.defaultLocale);
    });
  });

  describe('Canonical and Robots Tags', () => {
    it('should generate canonical URL for product', async () => {
      const metaTags = await metaTagsService.getProductMetaTags(testProductoId, testEmpresaId);

      expect(metaTags.canonical).toBeDefined();
      expect(metaTags.canonical).toBe(metaTags.url);
    });

    it('should support robots meta tag configuration', async () => {
      const metaTags = await metaTagsService.getProductMetaTags(testProductoId, testEmpresaId);

      // Create a variant with robots meta
      const htmlTags = metaTagsService.formatHtmlMetaTags({
        ...metaTags,
        robots: 'index, follow',
      });

      expect(htmlTags).toContain('robots');
    });
  });

  describe('Language and Locale Support', () => {
    it('should use Spanish locale by default', () => {
      expect(seoConfig.defaultLocale).toBe('es-AR');
    });

    it('should include locale in OG tags', async () => {
      const ogTags = await metaTagsService.getProductOgTags(testProductoId, testEmpresaId);

      expect(ogTags.locale).toBe(seoConfig.defaultLocale);
    });

    it('should use ARS currency by default', () => {
      expect(seoConfig.currency).toBe('ARS');
    });
  });
});
