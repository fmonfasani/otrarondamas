/**
 * Standard success response DTO
 * Wraps the actual data with metadata
 */
export class SuccessResponseDto<T> {
  /**
   * The actual response data
   */
  data: T;

  /**
   * Optional success message
   * @example "User created successfully"
   */
  message?: string;

  /**
   * Optional metadata about the response
   * (e.g., pagination info, counts, etc.)
   */
  meta?: {
    [key: string]: any;
  };

  constructor(
    data: T,
    message?: string,
    meta?: { [key: string]: any },
  ) {
    this.data = data;
    this.message = message;
    this.meta = meta;
  }
}
