import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';

export enum SortOption {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
}

export class SearchProductsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  familia?: string;

  @IsOptional()
  @IsNumber()
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  priceMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit: number = 20;

  @IsOptional()
  @IsEnum(SortOption)
  sort: SortOption = SortOption.RELEVANCE;
}

export class SearchOrdersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit: number = 20;
}
