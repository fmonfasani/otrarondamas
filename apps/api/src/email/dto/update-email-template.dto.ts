import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  asunto?: string;

  @IsOptional()
  @IsString()
  contenidoHtml?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
