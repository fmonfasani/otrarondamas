/**
 * SEO Controller
 * Endpoints for SEO metadata, sitemaps, and structured data
 */

import { Controller, Get, Param, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { MetaTagsService } from './services/meta-tags.service';
import { SitemapService } from './services/sitemap.service';
import { ExtractBusinessContext } from '../business-context/extract-business-context.decorator';
import { BusinessContext } from '../business-context/business-context.types';

@Controller('seo')
export class SeoController {
  constructor(
    private metaTagsService: MetaTagsService,
    private sitemapService: SitemapService,
  ) {}

  /**
   * GET /seo/meta?type=product&id=123
   * Get meta tags for a specific page
   */
  @Get('meta')
  async getMetaTags(
    @ExtractBusinessContext() empresaId: string,
    @Query('type') type: string = 'home',
    @Query('id') id?: string,
  ) {
    try {
      switch (type) {
        case 'product':
          if (!id) {
            throw new HttpException('Product ID required', HttpStatus.BAD_REQUEST);
          }
          return await this.metaTagsService.getProductMetaTags(id, empresaId);

        case 'category':
          if (!id) {
            throw new HttpException('Category ID required', HttpStatus.BAD_REQUEST);
          }
          return await this.metaTagsService.getCategoryMetaTags(id, empresaId);

        case 'home':
        default:
          return await this.metaTagsService.getHomeMetaTags(empresaId);
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /seo/schema/:type
   * Get JSON-LD structured data schema
   */
  @Get('schema/:type')
  async getSchema(
    @ExtractBusinessContext() empresaId: string,
    @Param('type') type: string,
    @Query('id') id?: string,
  ) {
    try {
      switch (type) {
        case 'product':
          if (!id) {
            throw new HttpException('Product ID required', HttpStatus.BAD_REQUEST);
          }
          return await this.metaTagsService.getProductSchema(id, empresaId);

        case 'organization':
          return await this.metaTagsService.getOrganizationSchema(empresaId);

        case 'breadcrumb':
          const path = id || '/';
          return this.metaTagsService.getBreadcrumbSchema(path);

        default:
          throw new HttpException(`Unknown schema type: ${type}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /seo/og/:type
   * Get Open Graph tags
   */
  @Get('og/:type')
  async getOgTags(
    @ExtractBusinessContext() empresaId: string,
    @Param('type') type: string,
    @Query('id') id?: string,
  ) {
    try {
      switch (type) {
        case 'product':
          if (!id) {
            throw new HttpException('Product ID required', HttpStatus.BAD_REQUEST);
          }
          return await this.metaTagsService.getProductOgTags(id, empresaId);

        default:
          throw new HttpException(`Unknown OG type: ${type}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /seo/twitter/:type
   * Get Twitter Card tags
   */
  @Get('twitter/:type')
  async getTwitterTags(
    @ExtractBusinessContext() empresaId: string,
    @Param('type') type: string,
    @Query('id') id?: string,
  ) {
    try {
      switch (type) {
        case 'product':
          if (!id) {
            throw new HttpException('Product ID required', HttpStatus.BAD_REQUEST);
          }
          return await this.metaTagsService.getProductTwitterTags(id, empresaId);

        default:
          throw new HttpException(`Unknown Twitter type: ${type}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /sitemap-index.xml
   * Get sitemap index
   */
  @Get('/sitemap-index.xml')
  async getSitemapIndex(
    @ExtractBusinessContext() empresaId: string,
    @Res() res: Response,
  ) {
    try {
      const xml = await this.sitemapService.generateSitemapIndex(empresaId);
      res.type('application/xml').send(xml);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /sitemap-products.xml
   * Get product sitemap
   */
  @Get('/sitemap-products.xml')
  async getProductSitemap(
    @ExtractBusinessContext() empresaId: string,
    @Res() res: Response,
  ) {
    try {
      const xml = await this.sitemapService.generateProductSitemap(empresaId);
      res.type('application/xml').send(xml);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /sitemap-categories.xml
   * Get category sitemap
   */
  @Get('/sitemap-categories.xml')
  async getCategorySitemap(
    @ExtractBusinessContext() empresaId: string,
    @Res() res: Response,
  ) {
    try {
      const xml = await this.sitemapService.generateCategorySitemap(empresaId);
      res.type('application/xml').send(xml);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /sitemap-pages.xml
   * Get pages sitemap
   */
  @Get('/sitemap-pages.xml')
  async getPagesSitemap(@Res() res: Response) {
    try {
      const xml = this.sitemapService.generatePagesSitemap();
      res.type('application/xml').send(xml);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /robots.txt
   * Get robots.txt
   */
  @Get('/robots.txt')
  getRobotsTxt(@Res() res: Response) {
    try {
      const txt = this.sitemapService.generateRobotsTxt();
      res.type('text/plain').send(txt);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /.htaccess (optional)
   * Get .htaccess configuration
   */
  @Get('/.htaccess')
  getHtaccess(@Res() res: Response) {
    try {
      const htaccess = this.sitemapService.generateHtaccess();
      res.type('text/plain').send(htaccess);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
