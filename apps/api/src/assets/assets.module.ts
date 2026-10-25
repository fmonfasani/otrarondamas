import { Module } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [AssetController],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetsModule {}
