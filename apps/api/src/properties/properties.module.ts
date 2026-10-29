import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { DemoService } from './demo.service';
import { PropertiesController } from './properties.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, DemoService],
  exports: [PropertiesService, DemoService],
})
export class PropertiesModule {}
