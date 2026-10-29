/**
 * Standard error response DTO
 * Used for all error responses across the API
 */
export class ErrorResponseDto {
  /**
   * HTTP status code
   * @example 400
   */
  statusCode: number;

  /**
   * Human-readable error message
   * @example "Validation failed"
   */
  message: string;

  /**
   * Detailed field-level errors (optional)
   * @example [{ field: "email", message: ["Email is required"] }]
   */
  errors?: Array<{
    field: string;
    message: string | string[];
  }>;

  /**
   * ISO 8601 timestamp when the error occurred
   * @example "2024-01-01T12:00:00.000Z"
   */
  timestamp: string;

  /**
   * The API endpoint path that caused the error
   * @example "/api/auth/login"
   */
  path: string;

  /**
   * Correlation ID for request tracking
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  correlationId: string;
}
