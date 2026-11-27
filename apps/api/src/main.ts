import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { PerformanceCollector } from './performance/performance.collector';
import { routeKey } from './performance/performance-math';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Rendimiento: how long each request takes, by its route pattern (never ids, data or who).
  const performance = app.get(PerformanceCollector);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      const pattern = (req.route as { path?: string } | undefined)?.path;
      performance.record(
        routeKey(req.method, pattern ? `${req.baseUrl}${pattern}` : undefined),
        res.statusCode,
        ms,
      );
    });
    next();
  });

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

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
