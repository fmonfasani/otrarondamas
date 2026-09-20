import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductoDto } from './create-producto.dto';

// codigoInterno no es editable por este endpoint: cambiarlo una vez
// creado el producto puede romper referencias externas (código de
// barras impreso, etiquetas ya generadas). Si en el futuro se necesita
// permitirlo, que sea una decisión explícita con su propio endpoint.
export class UpdateProductoDto extends PartialType(
  OmitType(CreateProductoDto, ['codigoInterno'] as const),
) {}
