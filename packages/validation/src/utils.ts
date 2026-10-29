import { z, ZodSchema, ZodError } from 'zod';

/**
 * Validation utility functions
 */

/**
 * Result type for validation operations
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

/**
 * Safe validation wrapper
 * Returns a discriminated union of success/failure
 */
export function safeValidate<T>(
  schema: ZodSchema,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data) as T;
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatErrors(error),
      };
    }
    return {
      success: false,
      errors: {
        _root: ['Error de validación desconocido'],
      },
    };
  }
}

/**
 * Format Zod validation errors into a readable object
 * Returns { fieldName: [error1, error2, ...] }
 */
export function formatErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.errors) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Get first error message for a field
 */
export function getFirstError(
  errors: Record<string, string[]>,
  fieldPath: string
): string | null {
  const errorList = errors[fieldPath];
  return errorList && errorList.length > 0 ? errorList[0] : null;
}

/**
 * Convert FormData to object for validation
 * Handles files, arrays, and nested objects
 */
export function createFormDataObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};

  for (const [key, value] of formData.entries()) {
    if (key.includes('.')) {
      // Handle nested properties like "address.street"
      const keys = key.split('.');
      let current = obj;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) {
          current[k] = {};
        }
        current = current[k];
      }

      const lastKey = keys[keys.length - 1];
      if (current[lastKey]) {
        // If key already exists, convert to array
        if (!Array.isArray(current[lastKey])) {
          current[lastKey] = [current[lastKey]];
        }
        current[lastKey].push(value);
      } else {
        current[lastKey] = value;
      }
    } else {
      if (obj[key]) {
        // If key already exists, convert to array (handles multiple checkboxes, etc.)
        if (!Array.isArray(obj[key])) {
          obj[key] = [obj[key]];
        }
        obj[key].push(value);
      } else {
        obj[key] = value;
      }
    }
  }

  return obj;
}

/**
 * Convert string values to appropriate types
 * Handles booleans, numbers, etc. from form submissions
 */
export function coerceFormValues(data: Record<string, any>): Record<string, any> {
  const coerced: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      coerced[key] = value.map((v) => coerceValue(v));
    } else if (typeof value === 'object' && value !== null) {
      coerced[key] = coerceFormValues(value);
    } else {
      coerced[key] = coerceValue(value);
    }
  }

  return coerced;
}

/**
 * Coerce individual value to appropriate type
 */
function coerceValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }

  // Handle booleans
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Handle null/empty
  if (value === 'null') return null;
  if (value === '') return '';

  // Handle numbers
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (/^\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  return value;
}

/**
 * Parse JSON safely with validation
 */
export function parseJSON<T>(
  json: string,
  schema: ZodSchema
): ValidationResult<T> {
  try {
    const parsed = JSON.parse(json);
    return safeValidate<T>(schema, parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        errors: {
          _root: ['JSON inválido: ' + error.message],
        },
      };
    }
    throw error;
  }
}

/**
 * Validation decorator for async functions
 * Usage: @validate(LoginSchema)
 * async login(input: Login) { ... }
 */
export function validate(schema: ZodSchema) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = safeValidate(schema, args[0]);

      if (!result.success) {
        throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`);
      }

      return originalMethod.call(this, result.data, ...args.slice(1));
    };

    return descriptor;
  };
}

/**
 * Get validation error summary as single string
 */
export function getErrorSummary(errors: Record<string, string[]>): string {
  const allErrors = Object.values(errors).flat();
  return allErrors.join('; ');
}

/**
 * Check if validation result has errors for specific field
 */
export function hasError(
  errors: Record<string, string[]>,
  fieldPath: string
): boolean {
  return !!(errors[fieldPath] && errors[fieldPath].length > 0);
}

/**
 * Merge multiple validation results
 */
export function mergeValidationResults<T>(
  results: ValidationResult<any>[]
): ValidationResult<any> {
  const allErrors: Record<string, string[]> = {};
  const allData: Record<string, any> = {};

  for (const result of results) {
    if (!result.success) {
      Object.assign(allErrors, result.errors);
    } else {
      Object.assign(allData, result.data);
    }
  }

  if (Object.keys(allErrors).length > 0) {
    return {
      success: false,
      errors: allErrors,
    };
  }

  return {
    success: true,
    data: allData,
  };
}
