import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { SearchService } from './search.service';
import {
  SearchProductsQueryDto,
  SearchOrdersQueryDto,
} from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExtractBusinessContext } from '../business-context/extract-business-context.decorator';
import { REQUEST } from '@nestjs/core';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('products')
  @HttpCode(HttpStatus.OK)
  async searchProducts(
    @Query() query: SearchProductsQueryDto,
    @ExtractBusinessContext() empresaId: string,
  ): Promise<SearchResultDto> {
    if (!query.q && !query.familia && query.priceMin === undefined && query.priceMax === undefined) {
      throw new BadRequestException(
        'At least one search criterion (q, familia, priceMin, priceMax) is required',
      );
    }

    const results = await this.searchService.searchProducts(
      empresaId,
      query,
    );

    return results;
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async searchOrders(
    @Query() query: SearchOrdersQueryDto,
    @ExtractBusinessContext() empresaId: string,
  ): Promise<SearchResultDto> {
    if (!query.q && !query.estado && !query.dateFrom && !query.dateTo) {
      throw new BadRequestException(
        'At least one search criterion (q, estado, dateFrom, dateTo) is required',
      );
    }

    const results = await this.searchService.searchOrders(
      empresaId,
      query,
    );

    return results;
  }

  @Get('facets/:index')
  @HttpCode(HttpStatus.OK)
  async getFacets(
    @Param('index') index: string,
    @ExtractBusinessContext() empresaId: string,
  ): Promise<any> {
    const validIndices = ['products', 'orders'];
    if (!validIndices.includes(index)) {
      throw new BadRequestException('Invalid index. Must be "products" or "orders"');
    }

    const facets = await this.searchService.getFacets(empresaId, index);
    return facets;
  }

  @Post('reindex/:index')
  @HttpCode(HttpStatus.ACCEPTED)
  async reindex(
    @Param('index') index: string,
    @ExtractBusinessContext() empresaId: string,
  ): Promise<{ status: string; message: string }> {
    // Only allow admins to reindex
    const validIndices = ['products', 'orders'];
    if (!validIndices.includes(index)) {
      throw new BadRequestException('Invalid index. Must be "products" or "orders"');
    }

    if (index === 'products') {
      await this.searchService.rebuildProductIndex(empresaId);
    } else {
      await this.searchService.rebuildOrderIndex(empresaId);
    }

    return {
      status: 'accepted',
      message: `Reindexing ${index} started for empresa ${empresaId}`,
    };
  }
}
