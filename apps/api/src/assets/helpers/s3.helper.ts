import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface S3ObjectMetadata {
  size: number;
  contentType: string;
  lastModified?: Date;
}

export interface ListObjectsResult {
  keys: string[];
  continuationToken?: string;
}

@Injectable()
export class S3Helper {
  private s3Client: S3Client;
  private bucket: string;
  private logger = new Logger(S3Helper.name);
  private mockMode = process.env.NODE_ENV === 'test';

  constructor(bucketName: string) {
    this.bucket = bucketName;
    // Initialize S3 client with AWS SDK v3
    // Credentials come from environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    if (!this.mockMode) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
      });
    }
  }

  /**
   * Upload object to S3
   */
  async putObject(
    key: string,
    body: Buffer | Uint8Array,
    metadata?: Record<string, string>,
  ): Promise<void> {
    try {
      if (this.mockMode) {
        this.logger.debug(`[MOCK S3] putObject: ${this.bucket}/${key}`);
        return;
      }

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        Metadata: metadata,
      });
      await this.s3Client.send(command);
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload to S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete object from S3
   */
  async deleteObject(key: string): Promise<void> {
    try {
      if (this.mockMode) {
        this.logger.debug(`[MOCK S3] deleteObject: ${this.bucket}/${key}`);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete from S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get object metadata from S3
   */
  async headObject(key: string): Promise<S3ObjectMetadata> {
    try {
      if (this.mockMode) {
        this.logger.debug(`[MOCK S3] headObject: ${this.bucket}/${key}`);
        return {
          size: 0,
          contentType: 'application/octet-stream',
        };
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'NotFound'
      ) {
        throw new BadRequestException(`Object not found: ${key}`);
      }
      throw new BadRequestException(
        `Failed to get metadata from S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * List objects with optional prefix and pagination
   */
  async listObjects(
    prefix: string,
    continuationToken?: string,
    maxKeys: number = 100,
  ): Promise<ListObjectsResult> {
    try {
      if (this.mockMode) {
        this.logger.debug(`[MOCK S3] listObjects: ${this.bucket}/${prefix}`);
        return {
          keys: [],
          continuationToken: undefined,
        };
      }

      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      });
      const response = await this.s3Client.send(command);
      return {
        keys: response.Contents?.map((obj) => obj.Key || '') || [],
        continuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to list objects from S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate signed URL for temporary access
   */
  async generateSignedUrl(
    key: string,
    expirationSeconds: number = 900, // 15 minutes default
  ): Promise<string> {
    try {
      if (this.mockMode) {
        this.logger.debug(`[MOCK S3] generateSignedUrl: ${this.bucket}/${key}`);
        // Return a mock signed URL for testing
        return `https://${this.bucket}.s3.amazonaws.com/${key}?X-Amz-Signature=mock&X-Amz-Expires=${expirationSeconds}`;
      }

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expirationSeconds,
      });
      return url;
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get public CDN URL (assumes CloudFront distribution or public bucket)
   */
  getCdnUrl(key: string, cdnDomain?: string): string {
    if (cdnDomain) {
      return `https://${cdnDomain}/${key}`;
    }
    // Fallback to S3 public URL (requires public read ACL)
    return `https://${this.bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }
}
