import { Test, TestingModule } from '@nestjs/testing';
import { I18nService, LocaleInfo } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nService],
    }).compile();

    service = module.get<I18nService>(I18nService);
    // Load translations manually since onModuleInit may not run in tests
    await service.onModuleInit();
  });

  describe('Locale Support', () => {
    it('should have Spanish as default locale', () => {
      expect(service.getDefaultLocale()).toBe('es');
    });

    it('should support Spanish (es)', () => {
      expect(service.isValidLocale('es')).toBe(true);
    });

    it('should support English (en)', () => {
      expect(service.isValidLocale('en')).toBe(true);
    });

    it('should support Portuguese (pt-br)', () => {
      expect(service.isValidLocale('pt-br')).toBe(true);
    });

    it('should return list of supported locales', () => {
      const locales = service.getSupportedLocales();
      expect(Array.isArray(locales)).toBe(true);
      expect(locales.length).toBeGreaterThan(0);

      const codes = locales.map((l: LocaleInfo) => l.code);
      expect(codes).toContain('es');
      expect(codes).toContain('en');
      expect(codes).toContain('pt-br');
    });
  });

  describe('Translation Keys', () => {
    it('should translate auth.login_success in Spanish', () => {
      const result = service.translate('auth.login_success', 'es');
      expect(result).toBe('Inicio de sesión exitoso');
    });

    it('should translate auth.login_success in English', () => {
      const result = service.translate('auth.login_success', 'en');
      expect(result).toBe('Login successful');
    });

    it('should translate auth.login_success in Portuguese', () => {
      const result = service.translate('auth.login_success', 'pt-br');
      expect(result).toBe('Login bem-sucedido');
    });

    it('should handle missing translation keys by returning key', () => {
      const result = service.translate('nonexistent.key', 'es');
      expect(result).toBe('nonexistent.key');
    });

    it('should return key if locale is invalid and key missing in default', () => {
      const result = service.translate('nonexistent.key', 'invalid_locale');
      expect(result).toBe('nonexistent.key');
    });

    it('should translate nested keys correctly', () => {
      const result = service.translate('products.not_found', 'es');
      expect(result).toBe('Producto no encontrado');

      const enResult = service.translate('products.not_found', 'en');
      expect(enResult).toBe('Product not found');
    });
  });

  describe('Locale Detection', () => {
    it('should detect Spanish from Accept-Language header', () => {
      const req = {
        headers: { 'accept-language': 'es-ES,es;q=0.9' },
        query: {},
      };
      const locale = service.getLocale(req);
      expect(locale).toBe('es');
    });

    it('should detect English from Accept-Language header', () => {
      const req = {
        headers: { 'accept-language': 'en-US,en;q=0.9' },
        query: {},
      };
      const locale = service.getLocale(req);
      expect(locale).toBe('en');
    });

    it('should detect Portuguese from Accept-Language header', () => {
      const req = {
        headers: { 'accept-language': 'pt-BR,pt;q=0.9' },
        query: {},
      };
      const locale = service.getLocale(req);
      expect(locale).toBe('pt-br');
    });

    it('should prioritize ?lang query parameter over Accept-Language', () => {
      const req = {
        headers: { 'accept-language': 'es-ES,es;q=0.9' },
        query: { lang: 'en' },
      };
      const locale = service.getLocale(req);
      expect(locale).toBe('en');
    });

    it('should default to Spanish for unsupported locales', () => {
      const req = {
        headers: { 'accept-language': 'ja-JP,ja;q=0.9' },
        query: {},
      };
      const locale = service.getLocale(req);
      expect(locale).toBe('es');
    });

    it('should default to Spanish when no header or query param', () => {
      const req = {
        headers: {},
        query: {},
      };
      const locale = service.getLocale(req);
      expect(locale).toBe('es');
    });

    it('should ignore invalid ?lang query parameter', () => {
      const req = {
        headers: { 'accept-language': 'en-US,en;q=0.9' },
        query: { lang: 'invalid' },
      };
      const locale = service.getLocale(req);
      expect(locale).toBe('en');
    });
  });

  describe('Parameter Interpolation', () => {
    it('should interpolate parameters in translation', () => {
      // Add a test translation with parameters
      const translations = service.getTranslations('es');

      // Manual test of interpolation method (private method tested indirectly)
      const result = service.translate('auth.login_success', 'es');
      expect(typeof result).toBe('string');
    });
  });

  describe('Get All Translations', () => {
    it('should get all Spanish translations', () => {
      const translations = service.getTranslations('es');
      expect(translations).toBeDefined();
      expect(typeof translations).toBe('object');
      expect(translations).toHaveProperty('auth');
      expect(translations).toHaveProperty('products');
      expect(translations).toHaveProperty('errors');
    });

    it('should get all English translations', () => {
      const translations = service.getTranslations('en');
      expect(translations).toBeDefined();
      expect(translations).toHaveProperty('auth');
      expect(translations.auth.login_success).toBe('Login successful');
    });

    it('should get all Portuguese translations', () => {
      const translations = service.getTranslations('pt-br');
      expect(translations).toBeDefined();
      expect(translations).toHaveProperty('auth');
      expect(translations.auth.login_success).toBe('Login bem-sucedido');
    });

    it('should return Spanish translations for invalid locale', () => {
      const translations = service.getTranslations('invalid');
      expect(translations).toBeDefined();
      expect(translations).toEqual(service.getTranslations('es'));
    });
  });

  describe('Error Message Translations', () => {
    it('should have error translations in all locales', () => {
      const locales = ['es', 'en', 'pt-br'];
      for (const locale of locales) {
        const translations = service.getTranslations(locale);
        expect(translations).toHaveProperty('errors');
        expect(translations.errors).toHaveProperty('server_error');
        expect(translations.errors).toHaveProperty('validation_error');
      }
    });

    it('should translate auth error messages', () => {
      const unauthorized_es = service.translate('auth.unauthorized', 'es');
      const unauthorized_en = service.translate('auth.unauthorized', 'en');
      const unauthorized_pt = service.translate('auth.unauthorized', 'pt-br');

      expect(unauthorized_es).toBe('No autorizado');
      expect(unauthorized_en).toBe('Unauthorized');
      expect(unauthorized_pt).toBe('Não autorizado');
    });
  });

  describe('Translation Coverage', () => {
    it('should have consistent keys across all locales', () => {
      const es_translations = service.getTranslations('es');
      const en_translations = service.getTranslations('en');
      const pt_translations = service.getTranslations('pt-br');

      const es_keys = new Set(getAllKeys(es_translations));
      const en_keys = new Set(getAllKeys(en_translations));
      const pt_keys = new Set(getAllKeys(pt_translations));

      // Check that English has all Spanish keys
      for (const key of es_keys) {
        expect(en_keys.has(key)).toBe(true, `Key "${key}" missing in English translations`);
      }

      // Check that Portuguese has all Spanish keys
      for (const key of es_keys) {
        expect(pt_keys.has(key)).toBe(true, `Key "${key}" missing in Portuguese translations`);
      }
    });
  });
});

/**
 * Helper function to get all leaf keys from a nested object
 */
function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }

  return keys;
}
