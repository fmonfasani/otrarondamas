import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessMiddleware } from './business.middleware';

@Module({
  imports: [PrismaModule],
  providers: [BusinessMiddleware],
})
export class BusinessModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BusinessMiddleware).forRoutes('businesses/:handle/api/*');
  }
}
