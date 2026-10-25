import { IsUUID, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @IsUUID()
  productoId!: string;

  @IsPositive()
  @Type(() => Number)
  cantidad!: number;
}
