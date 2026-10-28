import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('P13-1: Internationalization (i18n)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /i18n/locales', () => {
    it('should return list of supported locales', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/locales');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check structure of locale objects
      const locale = response.body[0];
      expect(locale).toHaveProperty('code');
      expect(locale).toHaveProperty('name');
      expect(locale).toHaveProperty('flag');
      expect(locale).toHaveProperty('direction');
    });

    it('should include Spanish locale', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/locales');
      const locales = response.body;
      const spanish = locales.find((l: any) => l.code === 'es');

      expect(spanish).toBeDefined();
      expect(spanish.name).toBe('Español');
      expect(spanish.direction).toBe('ltr');
    });

    it('should include English locale', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/locales');
      const locales = response.body;
      const english = locales.find((l: any) => l.code === 'en');

      expect(english).toBeDefined();
      expect(english.name).toBe('English');
    });

    it('should include Portuguese (Brazil) locale', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/locales');
      const locales = response.body;
      const portuguese = locales.find((l: any) => l.code === 'pt-br');

      expect(portuguese).toBeDefined();
      expect(portuguese.name).toContain('Português');
    });
  });

  describe('GET /i18n/detect', () => {
    it('should detect Spanish from Accept-Language header (es-ES)', async () => {
      const response = await request(app.getHttpServer())
        .get('/i18n/detect')
        .set('Accept-Language', 'es-ES,es;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.locale).toBe('es');
    });

    it('should detect English from Accept-Language header (en-US)', async () => {
      const response = await request(app.getHttpServer())
        .get('/i18n/detect')
        .set('Accept-Language', 'en-US,en;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.locale).toBe('en');
    });

    it('should detect Portuguese from Accept-Language header (pt-BR)', async () => {
      const response = await request(app.getHttpServer())
        .get('/i18n/detect')
        .set('Accept-Language', 'pt-BR,pt;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.locale).toBe('pt-br');
    });

    it('should prioritize ?lang query param over Accept-Language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/i18n/detect?lang=en')
        .set('Accept-Language', 'es-ES,es;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.locale).toBe('en');
    });

    it('should default to Spanish when unsupported locale in Accept-Language', async () => {
      const response = await request(app.getHttpServer())
        .get('/i18n/detect')
        .set('Accept-Language', 'ja-JP,ja;q=0.9'); // Japanese not supported

      expect(response.status).toBe(200);
      expect(response.body.locale).toBe('es'); // Default to Spanish
    });

    it('should default to Spanish when no Accept-Language header', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/detect');

      expect(response.status).toBe(200);
      expect(response.body.locale).toBe('es');
    });
  });

  describe('GET /i18n/translations', () => {
    it('should require locale parameter', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/translations');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should return Spanish translations', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/translations?locale=es');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('auth');
      expect(response.body.auth).toHaveProperty('login_success');
      expect(response.body.auth.login_success).toBe('Inicio de sesión exitoso');
    });

    it('should return English translations', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/translations?locale=en');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('auth');
      expect(response.body.auth.login_success).toBe('Login successful');
    });

    it('should return Portuguese translations', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/translations?locale=pt-br');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('auth');
      expect(response.body.auth.login_success).toBe('Login bem-sucedido');
    });

    it('should return error for invalid locale', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/translations?locale=invalid');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid locale');
    });

    it('should include product translations', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/translations?locale=es');

      expect(response.body).toHaveProperty('products');
      expect(response.body.products.not_found).toBe('Producto no encontrado');
    });

    it('should include error translations', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/translations?locale=en');

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.server_error).toBe('Internal server error');
    });
  });

  describe('GET /i18n/translate', () => {
    it('should require key parameter', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/translate');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('key');
    });

    it('should translate Spanish key', async () => {
      const response = await request(app.getHttpServer()).get(
        '/i18n/translate?key=auth.login_success&locale=es',
      );

      expect(response.status).toBe(200);
      expect(response.body.key).toBe('auth.login_success');
      expect(response.body.value).toBe('Inicio de sesión exitoso');
      expect(response.body.locale).toBe('es');
    });

    it('should translate English key', async () => {
      const response = await request(app.getHttpServer()).get(
        '/i18n/translate?key=products.not_found&locale=en',
      );

      expect(response.status).toBe(200);
      expect(response.body.value).toBe('Product not found');
      expect(response.body.locale).toBe('en');
    });

    it('should translate Portuguese key', async () => {
      const response = await request(app.getHttpServer()).get(
        '/i18n/translate?key=orders.created&locale=pt-br',
      );

      expect(response.status).toBe(200);
      expect(response.body.value).toBe('Pedido criado com sucesso');
      expect(response.body.locale).toBe('pt-br');
    });

    it('should handle missing translation keys (fallback to key)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/i18n/translate?key=nonexistent.key&locale=es',
      );

      expect(response.status).toBe(200);
      expect(response.body.value).toBe('nonexistent.key'); // Fallback to key
    });

    it('should use detected locale when not specified', async () => {
      const response = await request(app.getHttpServer())
        .get('/i18n/translate?key=auth.unauthorized')
        .set('Accept-Language', 'en-US,en;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.value).toBe('Unauthorized');
      expect(response.body.locale).toBe('en');
    });

    it('should handle nested key access', async () => {
      const response = await request(app.getHttpServer()).get(
        '/i18n/translate?key=payments.success&locale=es',
      );

      expect(response.status).toBe(200);
      expect(response.body.value).toBe('Pago completado exitosamente');
    });

    it('should return error for invalid locale', async () => {
      const response = await request(app.getHttpServer()).get(
        '/i18n/translate?key=auth.login_success&locale=invalid',
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid locale');
    });
  });

  describe('Locale detection in request', () => {
    it('should attach locale to request object from Accept-Language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/i18n/detect')
        .set('Accept-Language', 'es-ES,es;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.locale).toBe('es');
    });

    it('should attach locale to request object from ?lang query param', async () => {
      const response = await request(app.getHttpServer()).get('/i18n/detect?lang=pt-br');

      expect(response.status).toBe(200);
      expect(response.body.locale).toBe('pt-br');
    });
  });

  describe('Translation file coverage', () => {
    it('should have auth translations in all locales', async () => {
      const locales = ['es', 'en', 'pt-br'];

      for (const locale of locales) {
        const response = await request(app.getHttpServer()).get(
          `/i18n/translations?locale=${locale}`,
        );

        expect(response.body).toHaveProperty('auth');
        expect(response.body.auth).toHaveProperty('login_success');
        expect(response.body.auth).toHaveProperty('unauthorized');
      }
    });

    it('should have product translations in all locales', async () => {
      const locales = ['es', 'en', 'pt-br'];

      for (const locale of locales) {
        const response = await request(app.getHttpServer()).get(
          `/i18n/translations?locale=${locale}`,
        );

        expect(response.body).toHaveProperty('products');
        expect(response.body.products).toHaveProperty('not_found');
        expect(response.body.products).toHaveProperty('out_of_stock');
      }
    });

    it('should have error translations in all locales', async () => {
      const locales = ['es', 'en', 'pt-br'];

      for (const locale of locales) {
        const response = await request(app.getHttpServer()).get(
          `/i18n/translations?locale=${locale}`,
        );

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors).toHaveProperty('server_error');
        expect(response.body.errors).toHaveProperty('validation_error');
      }
    });
  });
});
