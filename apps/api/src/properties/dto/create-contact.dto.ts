import { IsEmail, IsNotEmpty, IsString, IsPhoneNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({
    description: 'Full name of the contact',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Phone number (can be international format)',
    example: '+54 9 11 2345-6789',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Contact message or inquiry',
    example: 'I am interested in viewing the property',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Optional: Property ID the contact is interested in',
    example: 'uuid-here',
    required: false,
  })
  @IsOptional()
  @IsString()
  propertyId?: string;
}
