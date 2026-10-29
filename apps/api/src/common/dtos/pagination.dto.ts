import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Standard pagination DTO for list endpoints
 * Provides consistent pagination across all list endpoints
 */
export class PaginationDto {
  /**
   * Number of items to return per page
   * @example 20
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  /**
   * Number of items to skip from the beginning
   * @example 0
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

/**
 * Pagination metadata in responses
 */
export class PaginationMeta {
  /**
   * Total number of items
   * @example 100
   */
  total_count: number;

  /**
   * Items returned in this page
   * @example 20
   */
  limit: number;

  /**
   * Items skipped
   * @example 0
   */
  offset: number;

  /**
   * Total number of pages
   * @example 5
   */
  total_pages: number;

  constructor(
    total_count: number,
    limit: number,
    offset: number,
  ) {
    this.total_count = total_count;
    this.limit = limit;
    this.offset = offset;
    this.total_pages = Math.ceil(total_count / limit);
  }
}
