import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  CorrelationIdMiddleware,
  RequestLoggerMiddleware,
  RateLimiterMiddleware,
} from './common/middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter (must be registered after pipes)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Register middleware in order
  // 1. Correlation ID - should be first
  app.use(new CorrelationIdMiddleware().use);

  // 2. Request logging
  app.use(new RequestLoggerMiddleware().use);

  // 3. Rate limiting
  app.use(new RateLimiterMiddleware().use);

  // CORS_ORIGINS is a comma-separated list of allowed origins (e.g.
  // 'https://otrarondamas.wapsell.com'). If not configured, it falls back to
  // the Vite ports in local development.
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Otra Roonda Más API')
    .setDescription('The Otra Roonda Más API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}
bootstrap();
