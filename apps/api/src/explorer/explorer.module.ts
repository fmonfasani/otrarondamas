import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreModule } from '../store/store.module';
import { AuthModule } from '../auth/auth.module';
import { ExplorerController } from './explorer.controller';
import { ExplorerService } from './explorer.service';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { SearchLogService } from './search-log.service';

/**
 * Marketplace (Owner, 2026-11-26): the explorer of stores and offers (step 2), its search
 * (step 3), and the buyer's favorites and the most searched words (step 3b).
 */
@Module({
  imports: [PrismaModule, StoreModule, AuthModule],
  controllers: [ExplorerController, FavoritesController],
  providers: [ExplorerService, FavoritesService, SearchLogService],
})
export class ExplorerModule {}
