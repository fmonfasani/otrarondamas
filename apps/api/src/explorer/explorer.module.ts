import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreModule } from '../store/store.module';
import { ExplorerController } from './explorer.controller';
import { ExplorerService } from './explorer.service';

/** Marketplace, step 2 (Owner, 2026-11-26): Wapsell's explorer of stores and offers. */
@Module({
  imports: [PrismaModule, StoreModule],
  controllers: [ExplorerController],
  providers: [ExplorerService],
})
export class ExplorerModule {}
