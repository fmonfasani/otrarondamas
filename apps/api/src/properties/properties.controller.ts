import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
  HttpStatus,
  HttpCode,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { PropertiesService } from './properties.service';
import { DemoService } from './demo.service';
import { Public } from '../auth/decorators/public.decorator';
import { CreateContactDto } from './dto/create-contact.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { PropertyResponseDto, PropertiesListResponseDto } from './dto/property.response.dto';

/**
 * H3: Properties Endpoints for Demo Property Listing and Contact Management
 * All endpoints are public (no authentication required for demo purposes)
 */
@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  // Rate limiting store: ip -> [timestamp, timestamp, ...]
  private readonly rateLimitStore = new Map<string, number[]>();
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
  private readonly RATE_LIMIT_MAX = 5; // 5 requests per hour per IP

  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly demoService: DemoService,
  ) {}

  /**
   * Get list of properties with filtering, search, and pagination
   * GET /properties?search=keyword&location=city&minPrice=100000&maxPrice=500000&type=apartment&bedrooms=3&limit=10&offset=0
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get properties list with filters and search' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by title or description' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'type', required: false, description: 'Property type (apartment, house, land, commercial)' })
  @ApiQuery({ name: 'bedrooms', required: false, type: Number, description: 'Number of bedrooms' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default 10, max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
  @ApiResponse({
    status: 200,
    description: 'Properties list retrieved successfully',
    type: PropertiesListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Database error',
  })
  async getProperties(
    @Query('search') search?: string,
    @Query('location') location?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('type') type?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      // Validate and parse numeric parameters
      const parsedMinPrice = minPrice ? parseFloat(minPrice) : undefined;
      const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : undefined;
      const parsedBedrooms = bedrooms ? parseInt(bedrooms, 10) : undefined;
      const parsedLimit = limit ? parseInt(limit, 10) : 10;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      if (parsedMinPrice !== undefined && isNaN(parsedMinPrice)) {
        throw new BadRequestException('minPrice must be a valid number');
      }
      if (parsedMaxPrice !== undefined && isNaN(parsedMaxPrice)) {
        throw new BadRequestException('maxPrice must be a valid number');
      }
      if (parsedBedrooms !== undefined && isNaN(parsedBedrooms)) {
        throw new BadRequestException('bedrooms must be a valid integer');
      }
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        throw new BadRequestException('limit must be a positive integer');
      }
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new BadRequestException('offset must be a non-negative integer');
      }

      return this.propertiesService.getProperties({
        search,
        location,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        type,
        bedrooms: parsedBedrooms,
        limit: parsedLimit,
        offset: parsedOffset,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid filter parameters');
    }
  }

  /**
   * Get a single property by ID
   * GET /properties/:id
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get property details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Property retrieved successfully',
    type: PropertyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  async getPropertyById(@Param('id') id: string) {
    return this.propertiesService.getPropertyById(id);
  }

  /**
   * Save demo contact form submission
   * POST /properties/demo/contact
   * Rate limited: 5 requests per hour per IP
   */
  @Public()
  @Post('demo/contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit demo contact form' })
  @ApiResponse({
    status: 200,
    description: 'Contact saved successfully',
    schema: {
      example: { message: 'Contact saved', lead_id: 'uuid-here' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 422,
    description: 'Email send failed',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (5 per IP per hour)',
  })
  @ApiResponse({
    status: 500,
    description: 'Database error',
  })
  async saveDemoContact(
    @Body() dto: CreateContactDto,
    @Req() request: Request,
  ) {
    const clientIp = this.getClientIp(request);

    // Check rate limit
    if (this.isRateLimited(clientIp)) {
      return {
        statusCode: 429,
        message: 'Too many requests. Rate limit: 5 per hour per IP',
      };
    }

    // Record the request
    this.recordRequest(clientIp);

    // Save contact
    const result = await this.demoService.saveContact({
      ...dto,
      ipAddress: clientIp,
    });

    return {
      message: 'Contact saved',
      ...result,
    };
  }

  /**
   * Verify email with token
   * GET /properties/demo/verify?token=...
   * Idempotent: Multiple calls with same token = same response
   */
  @Public()
  @Get('demo/verify')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiQuery({ name: 'token', required: true, description: 'Email verification token' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: { message: 'Email verified successfully', verified: true },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token',
  })
  @ApiResponse({
    status: 410,
    description: 'Token expired',
  })
  async verifyEmail(@Query('token') token?: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.demoService.verifyEmail(token);
  }

  /**
   * Get verification token (for testing only)
   * GET /properties/demo/token?email=...
   * This endpoint should be removed or protected in production
   */
  @Public()
  @Get('demo/token')
  @ApiOperation({ summary: 'Get verification token (testing only)' })
  @ApiQuery({ name: 'email', required: true })
  async getVerificationToken(@Query('email') email?: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    const token = await this.demoService.getVerificationToken(email);
    return { token };
  }

  /**
   * Helper: Extract client IP address
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Helper: Check if IP is rate limited
   */
  private isRateLimited(ip: string): boolean {
    const now = Date.now();
    const requests = this.rateLimitStore.get(ip) || [];

    // Remove old requests outside the window
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < this.RATE_LIMIT_WINDOW,
    );

    return recentRequests.length >= this.RATE_LIMIT_MAX;
  }

  /**
   * Helper: Record request for rate limiting
   */
  private recordRequest(ip: string): void {
    const now = Date.now();
    const requests = this.rateLimitStore.get(ip) || [];

    // Keep only recent requests
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < this.RATE_LIMIT_WINDOW,
    );

    recentRequests.push(now);
    this.rateLimitStore.set(ip, recentRequests);
  }
}
