import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ElasticsearchClient } from './elasticsearch.client';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SearchService, ElasticsearchClient],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
