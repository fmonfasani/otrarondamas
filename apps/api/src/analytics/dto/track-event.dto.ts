/* eslint-disable @typescript-eslint/no-explicit-any */
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export class TrackEventDto {
  @IsEnum(['PAGE_VIEW', 'CONVERSION', 'ERROR', 'PERFORMANCE', 'CUSTOM'])
  eventType: 'PAGE_VIEW' | 'CONVERSION' | 'ERROR' | 'PERFORMANCE' | 'CUSTOM';

  @IsString()
  eventName: string; // e.g., 'checkout_started', 'product_viewed'

  @IsString()
  @IsOptional()
  category?: string; // e.g., 'sales', 'inventory'

  @IsObject()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
