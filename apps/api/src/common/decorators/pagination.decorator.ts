import { applyDecorators, Query } from '@nestjs/common';

/**
 * @Pagination() Decorator
 * Validates limit and offset query parameters
 * Returns default values if not provided
 *
 * Usage:
 * @Get('items')
 * getItems(
 *   @Pagination() pagination: { limit: number; offset: number }
 * ) {
 *   // pagination.limit = 20 (default)
 *   // pagination.offset = 0 (default)
 * }
 */
export function Pagination() {
  return applyDecorators(
    Query('limit'),
    Query('offset'),
  );
}
