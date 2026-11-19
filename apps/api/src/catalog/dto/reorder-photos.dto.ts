import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/* eslint-disable indent */
/** The photos to put first, in that order (the first one is the photo of the store's list). */
export class ReorderPhotosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUUID(undefined, { each: true })
  ids: string[];
}
/* eslint-enable indent */
