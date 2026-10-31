import { Query } from '@nestjs/common';

/**
 * @PaginationLimit() and @PaginationOffset() Decorators
 * Validates limit and offset query parameters
 * Returns default values if not provided
 *
 * Usage:
 * @Get('items')
 * getItems(
 *   @PaginationLimit() limit: number,
 *   @PaginationOffset() offset: number
 * ) {
 *   // limit = 20 (default)
 *   // offset = 0 (default)
 * }
 */
export function PaginationLimit() {
  return Query('limit');
}

export function PaginationOffset() {
  return Query('offset');
}
