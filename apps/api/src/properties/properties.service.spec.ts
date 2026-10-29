import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: PrismaService;

  const mockProperties = [
    {
      id: '1',
      title: 'Modern Apartment',
      description: 'Beautiful apartment in the city center',
      type: 'apartment',
      price: 250000,
      bedrooms: 2,
      bathrooms: 1,
      location: 'Buenos Aires',
      address: 'Av. Corrientes 1234',
      latitude: -34.6037,
      longitude: -58.3816,
      images: [],
      amenities: ['pool', 'gym'],
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: '2',
      title: 'Spacious House',
      description: 'Large house with garden',
      type: 'house',
      price: 500000,
      bedrooms: 4,
      bathrooms: 2,
      location: 'Buenos Aires',
      address: 'Calle Rivadavia 5678',
      latitude: -34.6015,
      longitude: -58.3725,
      images: [],
      amenities: ['garage', 'garden'],
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              count: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProperties', () => {
    it('should return properties with pagination', async () => {
      const mockCount = jest.fn().mockResolvedValue(2);
      const mockFindMany = jest
        .fn()
        .mockResolvedValue([mockProperties[0]]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const result = await service.getProperties({
        limit: 10,
        offset: 0,
      });

      expect(result.properties).toHaveLength(1);
      expect(result.total_count).toBe(2);
      expect(result.has_more).toBe(true);
    });

    it('should filter by location', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest
        .fn()
        .mockResolvedValue([mockProperties[0]]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const result = await service.getProperties({
        location: 'Buenos Aires',
        limit: 10,
        offset: 0,
      });

      expect(result.total_count).toBe(1);
      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            location: expect.any(Object),
          }),
        }),
      );
    });

    it('should filter by price range', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest
        .fn()
        .mockResolvedValue([mockProperties[0]]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const result = await service.getProperties({
        minPrice: 200000,
        maxPrice: 300000,
        limit: 10,
        offset: 0,
      });

      expect(mockCount).toHaveBeenCalled();
      expect(mockFindMany).toHaveBeenCalled();
    });

    it('should filter by property type', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest
        .fn()
        .mockResolvedValue([mockProperties[0]]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const result = await service.getProperties({
        type: 'apartment',
        limit: 10,
        offset: 0,
      });

      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'apartment',
          }),
        }),
      );
    });

    it('should search by title and description', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest
        .fn()
        .mockResolvedValue([mockProperties[0]]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const result = await service.getProperties({
        search: 'Modern',
        limit: 10,
        offset: 0,
      });

      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('getPropertyById', () => {
    it('should return a property by id', async () => {
      const mockFindUnique = jest
        .fn()
        .mockResolvedValue(mockProperties[0]);

      (prisma.property.findUnique as jest.Mock) = mockFindUnique;

      const result = await service.getPropertyById('1');

      expect(result).toEqual(mockProperties[0]);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when property not found', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);

      (prisma.property.findUnique as jest.Mock) = mockFindUnique;

      await expect(service.getPropertyById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for soft-deleted property', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({
        ...mockProperties[0],
        deletedAt: new Date(),
      });

      (prisma.property.findUnique as jest.Mock) = mockFindUnique;

      await expect(service.getPropertyById('1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchProperties', () => {
    it('should search properties by query', async () => {
      const mockCount = jest.fn().mockResolvedValue(1);
      const mockFindMany = jest
        .fn()
        .mockResolvedValue([mockProperties[0]]);

      (prisma.property.count as jest.Mock) = mockCount;
      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const result = await service.searchProperties('Modern', 10, 0);

      expect(result.results).toHaveLength(1);
      expect(result.total_count).toBe(1);
    });

    it('should throw BadRequestException for empty search', async () => {
      await expect(service.searchProperties('', 10, 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for whitespace-only search', async () => {
      await expect(service.searchProperties('   ', 10, 0)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('filterByLocation', () => {
    it('should filter properties by location', async () => {
      const mockFindMany = jest
        .fn()
        .mockResolvedValue([mockProperties[0], mockProperties[1]]);

      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const result = await service.filterByLocation('Buenos Aires');

      expect(result).toHaveLength(2);
    });

    it('should throw BadRequestException for empty location', async () => {
      await expect(service.filterByLocation('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('filterByPrice', () => {
    it('should filter properties by price range', async () => {
      const mockFindMany = jest
        .fn()
        .mockResolvedValue([mockProperties[0]]);

      (prisma.property.findMany as jest.Mock) = mockFindMany;

      const result = await service.filterByPrice(200000, 300000);

      expect(result).toHaveLength(1);
    });

    it('should throw BadRequestException if minPrice > maxPrice', async () => {
      await expect(service.filterByPrice(500000, 200000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for negative prices', async () => {
      await expect(service.filterByPrice(-100, 500000)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
