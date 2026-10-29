import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Property, Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get properties with filtering, search, and pagination.
   * Filters: location, price range, type, bedrooms
   * Search: Full-text search on title and description
   */
  async getProperties(filters: {
    search?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    type?: string;
    bedrooms?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ properties: Property[]; total_count: number; has_more: boolean }> {
    const limit = Math.min(filters.limit || 10, 100); // Cap at 100
    const offset = filters.offset || 0;

    // Build where clause
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null, // Exclude soft-deleted properties
    };

    // Location filter (case-insensitive)
    if (filters.location) {
      where.location = {
        contains: filters.location,
        mode: 'insensitive',
      };
    }

    // Price range filter
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      where.AND = where.AND || [];
      (where.AND as Prisma.PropertyWhereInput[]).push({
        price: { gte: filters.minPrice },
      });
      (where.AND as Prisma.PropertyWhereInput[]).push({
        price: { lte: filters.maxPrice },
      });
    } else if (filters.minPrice !== undefined) {
      where.price = { gte: filters.minPrice };
    } else if (filters.maxPrice !== undefined) {
      where.price = { lte: filters.maxPrice };
    }

    // Type filter
    if (filters.type) {
      where.type = filters.type.toLowerCase();
    }

    // Bedrooms filter
    if (filters.bedrooms !== undefined) {
      where.bedrooms = filters.bedrooms;
    }

    // Full-text search on title and description
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      where.OR = [
        {
          title: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Fetch total count
    const total_count = await this.prisma.property.count({ where });

    // Fetch paginated results
    const properties = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return {
      properties,
      total_count,
      has_more: offset + properties.length < total_count,
    };
  }

  /**
   * Get a single property by ID
   */
  async getPropertyById(id: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property || property.deletedAt) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    return property;
  }

  /**
   * Search properties by query (title or description)
   */
  async searchProperties(
    query: string,
    limit = 10,
    offset = 0,
  ): Promise<{ results: Property[]; total_count: number }> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    };

    const total_count = await this.prisma.property.count({ where });

    const results = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return { results, total_count };
  }

  /**
   * Filter properties by location with optional radius
   */
  async filterByLocation(
    location: string,
    radiusKm?: number,
  ): Promise<Property[]> {
    if (!location || location.trim().length === 0) {
      throw new BadRequestException('Location cannot be empty');
    }

    // Basic location-based filtering (without geo calculations)
    // For geo-radius filtering, would need lat/lon and PostGIS
    const properties = await this.prisma.property.findMany({
      where: {
        location: {
          contains: location,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return properties;
  }

  /**
   * Filter properties by price range
   */
  async filterByPrice(minPrice: number, maxPrice: number): Promise<Property[]> {
    if (minPrice < 0 || maxPrice < 0) {
      throw new BadRequestException('Price values must be non-negative');
    }

    if (minPrice > maxPrice) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    return this.prisma.property.findMany({
      where: {
        price: {
          gte: minPrice,
          lte: maxPrice,
        },
        deletedAt: null,
      },
      orderBy: { price: 'asc' },
    });
  }

  /**
   * Get properties near a geographic location (requires lat/lon)
   * Note: This is a placeholder for geo-queries requiring PostGIS
   */
  async getPropertiesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm = 5,
  ): Promise<Property[]> {
    // For now, return all properties matching the general location
    // In production, use PostGIS extension for actual geo-radius calculations
    return this.prisma.property.findMany({
      where: {
        deletedAt: null,
        latitude: {
          gte: latitude - 0.05, // Rough approximation
          lte: latitude + 0.05,
        },
        longitude: {
          gte: longitude - 0.05,
          lte: longitude + 0.05,
        },
      },
    });
  }
}
