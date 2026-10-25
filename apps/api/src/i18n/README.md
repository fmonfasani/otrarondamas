# P13-1: Internationalization (i18n) Module

Multi-language support for Wapsell platform with locale detection, translation management, and localized error responses.

## Architecture Overview

The I18n module provides:

1. **I18nService**: Core translation service
2. **I18nMiddleware**: Automatic locale detection from request
3. **I18nExceptionFilter**: Global error message localization
4. **I18nController**: REST API endpoints for translations
5. **Translation Files**: JSON files for each supported language

## Supported Languages

- **Spanish (es)** - Default language
- **English (en)**
- **Portuguese (pt-br)** - Portuguese (Brazil)

Future support planned for French (fr) and Italian (it).

## Core Components

### I18nService

The central service providing translation and locale detection functionality.

#### Key Methods

```typescript
// Get translated string with optional parameter interpolation
translate(key: string, locale?: string, params?: TranslationParams): string

// Detect user's preferred locale from request headers/query params
getLocale(req: any): string

// Get list of supported locales with metadata
getSupportedLocales(): LocaleInfo[]

// Get all translations for a specific locale
getTranslations(locale?: string): Record<string, any>

// Validate if a locale is supported
isValidLocale(locale: string): boolean

// Get default locale
getDefaultLocale(): string
```

#### Locale Detection Priority

The `getLocale()` method detects the user's preferred locale using this priority:

1. **Query parameter**: `?lang=en` (highest priority)
2. **Accept-Language header**: `Accept-Language: es-ES,es;q=0.9`
3. **Default**: Spanish (`es`)

#### Translation Key Structure

Translation keys use dot notation to access nested values:

```typescript
// Key: "auth.login_success"
// Access: translations.auth.login_success
// Value: "Inicio de sesión exitoso"

service.translate('auth.login_success', 'es')
// Returns: "Inicio de sesión exitoso"
```

#### Parameter Interpolation

Translations can include placeholders using double curly braces:

```json
{
  "auth": {
    "welcome": "Welcome {{name}}"
  }
}
```

```typescript
service.translate('auth.welcome', 'en', { name: 'John' })
// Returns: "Welcome John"
```

### I18nMiddleware

Automatically detects the user's locale from request headers and query parameters, attaching it to `req.locale` for use throughout the request lifecycle.

**Applied globally to all routes.**

### I18nExceptionFilter

Global exception filter that localizes HTTP error messages. When an `HttpException` is thrown with a message key (e.g., `auth.unauthorized`), the filter automatically translates it based on the request's detected locale.

```typescript
// In a controller
throw new UnauthorizedException('auth.unauthorized');
// Response in Spanish: "No autorizado"
// Response in English: "Unauthorized"
// Response in Portuguese: "Não autorizado"
```

### I18nController

REST API endpoints for translation queries.

#### Endpoints

**GET /i18n/locales**
Returns list of supported locales with metadata.

```json
[
  {
    "code": "es",
    "name": "Español",
    "flag": "🇪🇸",
    "direction": "ltr"
  },
  ...
]
```

**GET /i18n/translations?locale=es**
Returns all translations for a specific locale.

**Query Parameters:**
- `locale` (required): Locale code (es, en, pt-br)

**GET /i18n/detect**
Detects user's preferred locale based on request headers and query parameters.

```json
{
  "locale": "es",
  "info": {
    "code": "es",
    "name": "Español",
    "flag": "🇪🇸",
    "direction": "ltr"
  }
}
```

**GET /i18n/translate?key=auth.login_success&locale=es**
Translates a specific key for a given locale.

**Query Parameters:**
- `key` (required): Translation key in dot notation
- `locale` (optional): Locale code. If omitted, uses detected locale.

## Translation Files Structure

Translation files are located in `apps/api/src/i18n/locales/` as JSON files.

### File Organization

```
apps/api/src/i18n/
├── locales/
│   ├── es.json       # Spanish translations
│   ├── en.json       # English translations
│   └── pt-br.json    # Portuguese (Brazil) translations
├── i18n.service.ts
├── i18n.middleware.ts
├── i18n-exception.filter.ts
├── i18n.controller.ts
├── i18n.module.ts
└── README.md
```

### Key Categories

Translations are organized by domain:

- **auth**: Authentication and authorization messages
- **products**: Product-related messages
- **orders**: Order-related messages
- **customers**: Customer-related messages
- **payments**: Payment processing messages
- **inventory**: Inventory management messages
- **errors**: Generic error messages
- **common**: Common UI messages

## Integration Guide

### Using in Controllers

```typescript
import { Controller, Get, Req } from '@nestjs/common';
import { I18nService } from './i18n/i18n.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly i18nService: I18nService) {}

  @Get(':id')
  getProduct(@Req() req: any, @Param('id') id: string) {
    const product = this.findProduct(id);
    
    if (!product) {
      throw new NotFoundException(
        this.i18nService.translate('products.not_found', req.locale)
      );
    }
    
    return product;
  }
}
```

### Using in Services

```typescript
import { Injectable } from '@nestjs/common';
import { I18nService } from './i18n/i18n.service';

@Injectable()
export class ProductService {
  constructor(private readonly i18nService: I18nService) {}

  validateStock(product: any, requestedQty: number, locale: string): void {
    if (product.stock < requestedQty) {
      throw new BadRequestException(
        this.i18nService.translate('products.out_of_stock', locale)
      );
    }
  }
}
```

### Global Module Integration

The I18nModule is imported as a **global module** in `AppModule`, making `I18nService` available throughout the application without additional imports.

```typescript
@Module({
  imports: [
    PrismaModule,
    I18nModule,  // Global module - no need to import in other modules
    AuthModule,
    // ... other modules
  ],
})
export class AppModule {}
```

## Adding New Translations

To add new translation keys:

1. **Add the key to all language files** (es.json, en.json, pt-br.json)
2. **Follow the existing structure** using nested objects for organization
3. **Ensure consistency** - all languages must have the same keys
4. **Test the translations** using the unit tests

Example:

```json
{
  "new_feature": {
    "success": "New feature created successfully",
    "error": "Error creating new feature"
  }
}
```

## Adding New Languages

To add support for a new language (e.g., French):

1. **Create new translation file**: `apps/api/src/i18n/locales/fr.json`
2. **Add translations** for all existing keys
3. **Update I18nService** to include the new language in `supportedLocales`:

```typescript
private supportedLocales: LocaleInfo[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸', direction: 'ltr' },
  { code: 'en', name: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'pt-br', name: 'Português (Brasil)', flag: '🇧🇷', direction: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', direction: 'ltr' }, // NEW
];
```

4. **Test the new language** in unit and integration tests

## Error Response Format

When an error is localized by the exception filter:

```json
{
  "statusCode": 401,
  "message": "No autorizado",
  "timestamp": "2026-10-25T20:30:00.000Z",
  "path": "/api/products/123"
}
```

## Testing

### Unit Tests

Run unit tests for the I18nService:

```bash
npm test -- src/i18n/i18n.service.spec.ts
```

**26 test cases covering:**

- Locale support (Spanish, English, Portuguese)
- Translation key lookups (nested keys, fallback)
- Locale detection (Accept-Language header, ?lang param)
- Parameter interpolation
- Translation file coverage consistency
- Error message translations

### Integration Tests

Run integration tests for the I18nController:

```bash
npm test -- test/integration/p13-1-i18n.integration-spec.ts
```

**20+ test cases covering:**

- REST API endpoints
- Locale detection accuracy
- Translation retrieval
- Parameter validation
- Multi-language support

## Performance Considerations

- Translations are loaded from JSON files **once at startup** (during `onModuleInit()`)
- Locale detection uses **in-memory lookups** (no database queries)
- Middleware is **applied globally** with minimal overhead
- Translation keys are looked up with **dot-notation parsing** (O(n) where n = key depth)

## Future Enhancements

1. **Database-backed translations**: Store translations in a `Translation` model for dynamic updates
2. **Pluralization**: Support plural forms (e.g., "1 item" vs "5 items")
3. **RTL support**: Right-to-left language support (Arabic, Hebrew)
4. **Regional formatting**: Date, number, and currency formatting per locale
5. **Translation fallback chains**: Fallback from pt-br → pt → es
6. **Hot reloading**: Update translations without server restart

## References

- [CLDR - Common Locale Data Repository](https://cldr.unicode.org/)
- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
- [Accept-Language Header Specification](https://tools.ietf.org/html/rfc7231#section-5.3.5)
- [NestJS i18n Best Practices](https://docs.nestjs.com/)
