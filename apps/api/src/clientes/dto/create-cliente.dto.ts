import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/* eslint-disable indent -- falso positivo conocido de la regla `indent`
   base con decorators en propiedades de clase, ver el resto de los DTOs
   del proyecto (caja/dto, catalogo/dto, compras/dto, etc.) */
export class CreateClienteDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  // Opcional en el modelo (Cliente.email: String?) — a diferencia de
  // Proveedor, un cliente de mostrador puede no tener email. Cuando SÍ
  // se manda, tiene que ser un email válido (igual criterio que
  // TiendaService.crearPedido(), que exige email siempre porque ahí es
  // el único identificador de contacto de un comprador anónimo).
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}
