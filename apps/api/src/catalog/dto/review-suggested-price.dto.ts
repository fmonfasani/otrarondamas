import { IsBoolean } from 'class-validator';

/** D10 (OR-B4-046 stage C1): apply the suggested price, or keep the current one. */
export class ReviewSuggestedPriceDto {
  @IsBoolean()
  aplicar: boolean;
}
