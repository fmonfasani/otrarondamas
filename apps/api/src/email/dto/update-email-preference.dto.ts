import { IsOptional, IsBoolean, IsEnum, IsObject } from 'class-validator';

export class UpdateEmailPreferenceDto {
  @IsOptional()
  @IsBoolean()
  suscrito?: boolean;

  @IsOptional()
  @IsEnum(['TODAS', 'SEMANAL', 'MENSUAL', 'NUNCA'])
  frecuencia?: 'TODAS' | 'SEMANAL' | 'MENSUAL' | 'NUNCA';

  @IsOptional()
  @IsObject()
  categoriasOptIn?: Record<string, boolean>;
}
