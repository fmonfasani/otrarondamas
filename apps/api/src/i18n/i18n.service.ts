import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LocaleInfo {
  code: string;
  name: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export interface TranslationParams {
  [key: string]: string | number;
}

@Injectable()
export class I18nService implements OnModuleInit {
  private translations: Record<string, Record<string, any>> = {};
  private supportedLocales: LocaleInfo[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸', direction: 'ltr' },
    { code: 'en', name: 'English', flag: '🇺🇸', direction: 'ltr' },
    { code: 'pt-br', name: 'Português (Brasil)', flag: '🇧🇷', direction: 'ltr' },
  ];

  private defaultLocale = 'es';

  async onModuleInit() {
    await this.loadTranslations();
  }

  /**
   * Load translations from JSON files in the locales directory
   */
  private async loadTranslations(): Promise<void> {
    // Try multiple possible locations for locales directory
    let localesDir = path.join(__dirname, 'locales');

    // If running from compiled dist, the path might be different
    if (!fs.existsSync(localesDir)) {
      localesDir = path.join(__dirname, '..', '..', '..', 'src', 'i18n', 'locales');
    }

    // If still not found, use dist location during tests
    if (!fs.existsSync(localesDir)) {
      localesDir = path.join(__dirname, 'locales');
    }

    // Ensure directory exists
    if (!fs.existsSync(localesDir)) {
      fs.mkdirSync(localesDir, { recursive: true });
    }

    // Load each locale file
    for (const locale of this.supportedLocales) {
      const filePath = path.join(localesDir, `${locale.code}.json`);

      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.translations[locale.code] = JSON.parse(content);
        } catch (error) {
          console.error(
            `Error loading translations for locale ${locale.code}:`,
            error,
          );
          // Initialize empty object if file fails to load
          this.translations[locale.code] = {};
        }
      } else {
        // Initialize empty object if file doesn't exist
        this.translations[locale.code] = {};
      }
    }

    console.log(
      `[I18n] Loaded translations for locales: ${Object.keys(this.translations).join(', ')}`,
    );
  }

  /**
   * Get translated string with optional parameter interpolation
   * @param key - Translation key using dot notation (e.g., 'auth.login_success')
   * @param locale - Locale code (e.g., 'es', 'en')
   * @param params - Object with parameters for interpolation
   * @returns Translated string, or key if not found
   */
  translate(
    key: string,
    locale: string = this.defaultLocale,
    params?: TranslationParams,
  ): string {
    // Validate locale
    const validLocale = this.isValidLocale(locale) ? locale : this.defaultLocale;

    // Get nested translation value using dot notation
    const value = this.getNestedValue(
      this.translations[validLocale],
      key,
    );

    if (!value) {
      // Return key if translation not found (fallback)
      return key;
    }

    // Interpolate parameters if provided
    if (params && typeof value === 'string') {
      return this.interpolate(value, params);
    }

    return String(value);
  }

  /**
   * Detect locale from request
   * Priority: Accept-Language header > ?lang query param > default
   * @param req - Express request object
   * @returns Locale code
   */
  getLocale(req: any): string {
    // Check query parameter first
    if (req.query?.lang) {
      const lang = req.query.lang as string;
      if (this.isValidLocale(lang)) {
        return lang;
      }
    }

    // Check Accept-Language header
    const acceptLanguage = req.headers['accept-language'] as string;
    if (acceptLanguage) {
      const preferredLocale = this.parseAcceptLanguageHeader(acceptLanguage);
      if (preferredLocale) {
        return preferredLocale;
      }
    }

    // Return default locale
    return this.defaultLocale;
  }

  /**
   * Get list of supported locales
   */
  getSupportedLocales(): LocaleInfo[] {
    return this.supportedLocales;
  }

  /**
   * Get all translations for a specific locale
   * @param locale - Locale code
   */
  getTranslations(locale: string = this.defaultLocale): Record<string, any> {
    if (!this.isValidLocale(locale)) {
      return this.translations[this.defaultLocale];
    }
    return this.translations[locale];
  }

  /**
   * Validate if a locale is supported
   */
  isValidLocale(locale: string): boolean {
    return this.supportedLocales.some((l) => l.code === locale);
  }

  /**
   * Get default locale
   */
  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  /**
   * Get nested value from object using dot notation
   * @example getNestedValue({auth: {login: 'Login'}}, 'auth.login') => 'Login'
   */
  private getNestedValue(obj: any, keyPath: string): any {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    const keys = keyPath.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * Interpolate parameters into translation string
   * @example interpolate('Hello {{name}}', {name: 'John'}) => 'Hello John'
   */
  private interpolate(str: string, params: TranslationParams): string {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return String(params[key] ?? match);
    });
  }

  /**
   * Parse Accept-Language header and return best matching locale
   * @example parseAcceptLanguageHeader('es-ES,es;q=0.9,en;q=0.8') => 'es'
   */
  private parseAcceptLanguageHeader(headerValue: string): string | null {
    try {
      const languages = headerValue
        .split(',')
        .map((lang) => {
          const [code, q = 'q=1'] = lang.trim().split(';');
          const qualityValue = parseFloat(q.replace('q=', ''));
          return {
            code: code.toLowerCase().split('-')[0], // Get primary language tag
            quality: isNaN(qualityValue) ? 1 : qualityValue,
          };
        })
        .sort((a, b) => b.quality - a.quality);

      for (const lang of languages) {
        // Try exact match first
        if (this.supportedLocales.some((l) => l.code === lang.code)) {
          return lang.code;
        }

        // Try regional variant (e.g., 'pt' -> 'pt-br')
        const regional = this.supportedLocales.find((l) =>
          l.code.startsWith(lang.code),
        );
        if (regional) {
          return regional.code;
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}
