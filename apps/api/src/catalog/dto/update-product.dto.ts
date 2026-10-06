import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// codigoInterno is not editable through this endpoint: changing it once the
// product exists can break external references (printed barcode, labels
// already generated). If it ever needs to be allowed, that must be an
// explicit decision with its own endpoint.
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['codigoInterno'] as const),
) {}
