import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  // The actual file is handled by the controller as `file: Express.Multer.File`
  // This DTO only covers optional metadata
}
