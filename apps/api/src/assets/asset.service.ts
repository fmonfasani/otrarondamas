import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Helper } from './helpers/s3.helper';
import { Asset } from '@prisma/client';
import { AssetResponseDto, AssetListResponseDto } from './dto';

interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  [key: string]: any;
}

@Injectable()
export class AssetService {
  private s3Helper: S3Helper;
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
  ];
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_MONTHLY_STORAGE = 1024 * 1024 * 1024; // 1GB

  constructor(private prisma: PrismaService) {
    this.s3Helper = new S3Helper(
      process.env.AWS_S3_BUCKET || 'wapsell-assets-prod',
    );
  }

  /**
   * Upload asset to S3 and create database record
   */
  async uploadAsset(
    file: Express.Multer.File,
    empresaId: string,
    altText?: string,
  ): Promise<AssetResponseDto> {
    // Validate file type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Check monthly storage limit
    const monthlyUsage = await this.getMonthlyStorageUsage(empresaId);
    if (monthlyUsage + file.size > this.MAX_MONTHLY_STORAGE) {
      throw new BadRequestException(
        `Monthly storage limit exceeded. Current usage: ${monthlyUsage / 1024 / 1024}MB, Limit: ${this.MAX_MONTHLY_STORAGE / 1024 / 1024}MB`,
      );
    }

    // Generate S3 key with tenant prefix
    const s3Key = this.generateS3Key(empresaId, file.originalname);

    // Upload to S3
    await this.s3Helper.putObject(s3Key, file.buffer, {
      'original-filename': file.originalname,
      'uploaded-by': empresaId,
    });

    // Extract metadata (simplified - in production, use image/video libraries)
    const metadata = this.extractMetadata(file);

    // Generate CDN URL
    const cdnUrl = this.s3Helper.getCdnUrl(
      s3Key,
      process.env.AWS_CLOUDFRONT_DOMAIN,
    );

    // Create database record
    const asset = await this.prisma.asset.create({
      data: {
        empresaId,
        fileName: file.originalname,
        s3Key,
        contentType: file.mimetype,
        size: file.size,
        cdnUrl,
        altText,
        metadata,
      },
    });

    return this.mapToResponseDto(asset);
  }

  /**
   * Delete asset from S3 and database
   */
  async deleteAsset(assetId: string, empresaId: string): Promise<void> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found: ${assetId}`);
    }

    // Verify ownership
    if (asset.empresaId !== empresaId) {
      throw new ForbiddenException(
        'You do not have permission to delete this asset',
      );
    }

    // Delete from S3
    await this.s3Helper.deleteObject(asset.s3Key);

    // Soft delete from database
    await this.prisma.asset.update({
      where: { id: assetId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * List assets with pagination
   */
  async listAssets(
    empresaId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<AssetListResponseDto> {
    const skip = (page - 1) * pageSize;

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where: {
          empresaId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.asset.count({
        where: {
          empresaId,
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: assets.map((asset) => this.mapToResponseDto(asset)),
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    };
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string, empresaId: string): Promise<AssetResponseDto> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found: ${assetId}`);
    }

    if (asset.empresaId !== empresaId) {
      throw new ForbiddenException(
        'You do not have permission to access this asset',
      );
    }

    return this.mapToResponseDto(asset);
  }

  /**
   * Generate signed URL for temporary download
   */
  async generateSignedUrl(
    assetId: string,
    empresaId: string,
    ttlSeconds: number = 900, // 15 minutes
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found: ${assetId}`);
    }

    if (asset.empresaId !== empresaId) {
      throw new ForbiddenException(
        'You do not have permission to access this asset',
      );
    }

    const signedUrl = await this.s3Helper.generateSignedUrl(
      asset.s3Key,
      ttlSeconds,
    );

    return {
      signedUrl,
      expiresIn: ttlSeconds,
    };
  }

  /**
   * Get asset metadata
   */
  async getAssetMetadata(
    assetId: string,
    empresaId: string,
  ): Promise<{ size: number; type: string; uploadedAt: Date; metadata?: FileMetadata }> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found: ${assetId}`);
    }

    if (asset.empresaId !== empresaId) {
      throw new ForbiddenException(
        'You do not have permission to access this asset',
      );
    }

    return {
      size: asset.size,
      type: asset.contentType,
      uploadedAt: asset.createdAt,
      metadata: asset.metadata as FileMetadata | undefined,
    };
  }

  /**
   * Placeholder for image resize (future Lambda integration)
   */
  async triggerImageResize(
    assetId: string,
    empresaId: string,
    width: number,
    height: number,
    format: 'jpg' | 'png' | 'webp' = 'webp',
  ): Promise<{ message: string; jobId: string }> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found: ${assetId}`);
    }

    if (asset.empresaId !== empresaId) {
      throw new ForbiddenException(
        'You do not have permission to access this asset',
      );
    }

    // Check if it's an image
    if (!asset.contentType.startsWith('image/')) {
      throw new BadRequestException(
        'Only images can be resized',
      );
    }

    // Placeholder for Lambda invocation
    // In production, this would trigger an AWS Lambda function via SQS or direct invocation
    const jobId = `resize-${assetId}-${Date.now()}`;

    return {
      message: `Image resize job queued. Job ID: ${jobId}`,
      jobId,
    };
  }

  // ============ Private helpers ============

  private generateS3Key(empresaId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `empresas/${empresaId}/${timestamp}-${sanitized}`;
  }

  private async getMonthlyStorageUsage(empresaId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.asset.aggregate({
      where: {
        empresaId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
        deletedAt: null,
      },
      _sum: {
        size: true,
      },
    });

    return result._sum.size || 0;
  }

  private extractMetadata(file: Express.Multer.File): FileMetadata {
    const metadata: FileMetadata = {};

    // Basic metadata extraction
    if (file.mimetype.startsWith('image/')) {
      // In production, use sharp or jimp to extract image dimensions
      metadata.fileType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      metadata.fileType = 'video';
    } else if (file.mimetype === 'application/pdf') {
      metadata.fileType = 'document';
    }

    return metadata;
  }

  private mapToResponseDto(asset: Asset): AssetResponseDto {
    return new AssetResponseDto({
      id: asset.id,
      fileName: asset.fileName,
      s3Key: asset.s3Key,
      contentType: asset.contentType,
      size: asset.size,
      cdnUrl: asset.cdnUrl,
      altText: asset.altText || undefined,
      metadata: asset.metadata as Record<string, any> | undefined,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    });
  }
}
