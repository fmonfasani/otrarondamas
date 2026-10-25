import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export class AggregationQueryDto {
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsString()
  @IsOptional()
  eventType?: string;

  @IsString()
  @IsOptional()
  eventName?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
