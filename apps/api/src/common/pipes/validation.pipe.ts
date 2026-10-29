import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Custom Validation Pipe
 * Validates DTOs using class-validator decorators
 * Returns 400 with detailed field-level errors
 *
 * Usage: @UsePipes(new ValidationPipe()) on controller methods
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  async transform(value: any, metadata: any) {
    if (!metadata.type || !this.isClass(metadata.type)) {
      return value;
    }

    const object = plainToClass(metadata.type, value);
    const errors = await validate(object, {
      skipMissingProperties: false,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      this.logger.warn(
        `Validation failed for ${metadata.type.name}`,
        JSON.stringify(formattedErrors),
      );

      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    return object;
  }

  /**
   * Format validation errors into a readable structure
   */
  private formatErrors(errors: any[]): Array<{
    field: string;
    message: string | string[];
  }> {
    return errors.map((error) => ({
      field: error.property,
      message: error.constraints
        ? Object.values(error.constraints)
        : 'Validation error',
    }));
  }

  /**
   * Check if metadata type is a class
   */
  private isClass(func: any): boolean {
    const str = func.toString();
    return /^class\s|^class\s+\w+/.test(str);
  }
}
