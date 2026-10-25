import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  nombre: string;

  @IsEnum(['TRANSACCIONAL', 'MARKETING', 'ALERTAS'])
  tipo: 'TRANSACCIONAL' | 'MARKETING' | 'ALERTAS';

  @IsString()
  asunto: string;

  @IsString()
  contenidoHtml: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
