import { Controller, Get, Query, Req, BadRequestException } from '@nestjs/common';
import { I18nService, LocaleInfo } from './i18n.service';

/**
 * I18n REST API Controller
 * Endpoints for language detection, translations, and locale information
 */
@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  /**
   * GET /i18n/locales
   * Returns list of supported locales with metadata
   */
  @Get('locales')
  getSupportedLocales(): LocaleInfo[] {
    return this.i18nService.getSupportedLocales();
  }

  /**
   * GET /i18n/translations/:locale
   * Returns all translations for a specific locale
   * @param locale - Locale code (es, en, pt-br)
   */
  @Get('translations')
  getTranslations(@Query('locale') locale?: string): Record<string, any> {
    if (!locale) {
      throw new BadRequestException('Locale parameter is required');
    }

    if (!this.i18nService.isValidLocale(locale)) {
      throw new BadRequestException(
        `Invalid locale. Supported locales: ${this.i18nService
          .getSupportedLocales()
          .map((l) => l.code)
          .join(', ')}`,
      );
    }

    return this.i18nService.getTranslations(locale);
  }

  /**
   * GET /i18n/detect
   * Detects user's preferred locale based on request headers/query params
   * Returns the detected locale code and metadata
   */
  @Get('detect')
  detectLocale(@Req() req: any): { locale: string; info: LocaleInfo } {
    const locale = this.i18nService.getLocale(req);
    const info = this.i18nService.getSupportedLocales().find((l) => l.code === locale);

    return {
      locale,
      info: info || { code: locale, name: 'Unknown', flag: '', direction: 'ltr' },
    };
  }

  /**
   * GET /i18n/translate
   * Translates a specific key for a given locale
   * @param key - Translation key (dot notation, e.g., 'auth.login_success')
   * @param locale - Locale code (optional, defaults to detected locale)
   */
  @Get('translate')
  translate(
    @Req() req: any,
    @Query('key') key?: string,
    @Query('locale') locale?: string,
  ): { key: string; value: string; locale: string } {
    if (!key) {
      throw new BadRequestException('Translation key is required');
    }

    const targetLocale = locale || this.i18nService.getLocale(req);

    if (!this.i18nService.isValidLocale(targetLocale)) {
      throw new BadRequestException(
        `Invalid locale: ${targetLocale}. Supported locales: ${this.i18nService
          .getSupportedLocales()
          .map((l) => l.code)
          .join(', ')}`,
      );
    }

    const value = this.i18nService.translate(key, targetLocale);

    return {
      key,
      value,
      locale: targetLocale,
    };
  }
}
