import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class ResizeImageDto {
  @IsInt()
  @Min(1)
  width: number;

  @IsInt()
  @Min(1)
  height: number;

  @IsOptional()
  @IsIn(['jpg', 'png', 'webp'])
  format?: 'jpg' | 'png' | 'webp';
}
