import { ApiProperty } from '@nestjs/swagger';

export class PropertyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  bedrooms: number;

  @ApiProperty()
  bathrooms: number;

  @ApiProperty()
  location: string;

  @ApiProperty()
  address: string;

  @ApiProperty({ required: false })
  latitude?: number;

  @ApiProperty({ required: false })
  longitude?: number;

  @ApiProperty({ required: false })
  images?: any[];

  @ApiProperty({ required: false })
  amenities?: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PropertiesListResponseDto {
  @ApiProperty({ type: [PropertyResponseDto] })
  properties: PropertyResponseDto[];

  @ApiProperty()
  total_count: number;

  @ApiProperty()
  has_more: boolean;
}
