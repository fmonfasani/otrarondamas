import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

/**
 * STORE-V1-03 — order of a signed-in store customer. Only the items: the name, email
 * and phone come from the customer's account, never from the request.
 */
/* eslint-disable indent */
export class CustomerOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
