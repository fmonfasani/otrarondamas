import { IsISO8601, IsOptional, IsEnum, Min, Max } from 'class-validator';

/**
 * P9-2: Base date range query parameters for all metrics endpoints.
 *
 * Supports daily, weekly, monthly aggregation and optional period-over-period
 * comparison (previous period or year-ago).
 */
export class DateRangeQueryDto {
  @IsISO8601()
  startDate: string; // ISO 8601 date: '2026-10-01'

  @IsISO8601()
  endDate: string;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'], {
    message: 'groupBy must be one of: daily, weekly, monthly',
  })
  groupBy?: 'daily' | 'weekly' | 'monthly' = 'daily';

  @IsOptional()
  @IsEnum(['previous_period', 'year_ago', 'none'], {
    message: 'compareTo must be one of: previous_period, year_ago, none',
  })
  compareTo?: 'previous_period' | 'year_ago' | 'none' = 'none';
}

/**
 * Cohort-specific query parameters for retention and LTV analysis.
 * Extends DateRangeQueryDto with cohort bucketing granularity.
 */
export class CohortQueryDto extends DateRangeQueryDto {
  @IsEnum(['weekly', 'monthly'], {
    message: 'cohortPeriod must be one of: weekly, monthly',
  })
  cohortPeriod: 'weekly' | 'monthly' = 'monthly';

  @IsOptional()
  @Min(1)
  @Max(36)
  lookbackMonths?: number = 12;
}

/**
 * Query parameters for product metrics with optional top-N limiting.
 */
export class GetProductsQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @Min(1)
  @Max(100)
  topN?: number = 10;
}

/**
 * Query parameters for AOV (Average Order Value) and churn metrics.
 */
export class GetOrdersQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsEnum(['RECIBIDO', 'CONFIRMADO', 'ENTREGADO', 'CANCELADO'], {
    message: 'orderStatus must be one of: RECIBIDO, CONFIRMADO, ENTREGADO, CANCELADO',
  })
  orderStatus?: string;
}

/**
 * Query for CAC (Customer Acquisition Cost) calculation.
 * Note: Requires external marketing spend data (out of scope for P9-2).
 */
export class GetCACQueryDto extends DateRangeQueryDto {
  @IsOptional()
  marketingChannel?: string; // e.g., 'google_ads', 'facebook', 'email'
}

/**
 * Query for channel breakdown (e.g., WhatsApp, Web, In-Person).
 */
export class GetChannelQueryDto extends DateRangeQueryDto {
  @IsOptional()
  channel?: string; // Filter to specific channel; omit for all
}

/**
 * Query for LTV (Lifetime Value) by customer cohort.
 */
export class GetLTVQueryDto {
  @IsISO8601()
  cohortStartDate: string; // Start of signup cohort period

  @IsISO8601()
  cohortEndDate: string; // End of signup cohort period

  @IsOptional()
  @Min(1)
  @Max(36)
  lookbackMonths?: number = 12; // How far to track each cohort
}
