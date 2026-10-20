import { IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @IsPositive()
  @Type(() => Number)
  cantidad!: number;
}
