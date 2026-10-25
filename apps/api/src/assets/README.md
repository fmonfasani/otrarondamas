# P12-1: CDN Infrastructure — Asset Management Service

## Overview

P12-1 implements a complete CDN and asset management system for Wapsell, enabling secure, scalable storage and delivery of user-generated content (images, videos, documents) via AWS S3 and CloudFront.

**Status**: Architecture defined, core implementation complete, S3 integration mocked for tests.

## Architecture

### Components

1. **AssetService** (`asset.service.ts`): Core business logic
   - File upload with validation
   - Multi-tenant isolation (via `empresaId`)
   - Storage quota management (50MB per file, 1GB per empresa per month)
   - Metadata extraction and storage
   - Soft deletion (for audit trails)

2. **AssetController** (`asset.controller.ts`): REST API (6 endpoints)
   - POST `/assets/upload` — Upload file
   - GET `/assets` — List assets with pagination
   - GET `/assets/:id` — Retrieve single asset
   - GET `/assets/:id/download` — Generate signed URL
   - GET `/assets/:id/metadata` — Get metadata
   - DELETE `/assets/:id` — Delete asset
   - POST `/assets/:id/resize` — Trigger image optimization (future)

3. **S3Helper** (`helpers/s3.helper.ts`): AWS SDK wrapper
   - `putObject()` — Upload to S3
   - `deleteObject()` — Delete from S3
   - `headObject()` — Fetch metadata
   - `listObjects()` — Paginated listing with prefix
   - `generateSignedUrl()` — Temporary access URLs
   - `getCdnUrl()` — Public CDN URL generation

4. **Asset Model** (`prisma/schema.prisma`): Database schema
   ```prisma
   model Asset {
     id            String    @id @default(cuid())
     empresaId     String    // Multi-tenant scoping
     fileName      String
     s3Key         String    @unique
     contentType   String
     size          Int
     cdnUrl        String    // CloudFront URL
     altText       String?
     metadata      Json?     // Custom metadata (width, height, duration, etc.)
     createdAt     DateTime  @default(now())
     updatedAt     DateTime  @updatedAt
     deletedAt     DateTime? // Soft delete
     Empresa       Empresa   @relation(...)
   }
   ```

## Data Flow

```
Client (Web/Mobile)
    ↓
POST /assets/upload (multipart/form-data)
    ↓
AssetController.uploadAsset()
    ├─ Extract empresaId from JWT
    ├─ Validate file type (allowlist)
    ├─ Validate file size (max 50MB)
    ├─ Check monthly quota
    ↓
AssetService.uploadAsset()
    ├─ Generate S3 key: empresas/{empresaId}/{timestamp}-{filename}
    ├─ Call S3Helper.putObject()
    ↓
S3Helper.putObject()
    └─ AWS SDK v3 → S3:PutObject
    
    ↓
[S3 Bucket: wapsell-assets-prod]
    ↓
Prisma.asset.create()
    ├─ Store metadata (size, type, altText)
    ├─ Store CDN URL
    └─ Index by empresaId for multi-tenant queries
    
    ↓
Response: AssetResponseDto
{
  id, fileName, s3Key, contentType, size,
  cdnUrl, altText, metadata, createdAt, updatedAt
}
```

## Security & Multi-Tenancy

### Isolation Strategy

1. **Database Level**: `empresaId` field on Asset model
   - Prisma extension (company-scope.extension.ts) enforces filtering
   - All queries automatically scoped to authenticated empresa
   - Soft-deletion with index on `deletedAt` to prevent data leakage

2. **S3 Prefix Structure**: `empresas/{empresaId}/{timestamp}-{filename}`
   - Logical segregation (not cryptographic)
   - Supports prefix-based access policies (future S3 bucket policies)

3. **API Authorization**:
   - `@RequirePermission('asset:upload')` — Authorization guard
   - `@GetBusinessContext()` — Extracts `empresaId` from JWT
   - Each endpoint validates ownership before action

### File Validation

**Allowed MIME Types**:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`
- Videos: `video/mp4`, `video/quicktime`

**File Size Limits**:
- Per-file: 50MB
- Per-empresa per-month: 1GB
- Monthly usage tracked via aggregated Prisma query

### Signed URLs

Private assets can be downloaded via temporary signed URLs:
```bash
GET /assets/{id}/download?ttl=900
→ { signedUrl: "https://..../file?X-Amz-Signature=...", expiresIn: 900 }
```

**TTL Bounds**: 60 seconds (minimum) to 1 day (maximum)

## AWS Infrastructure Setup

### Required AWS Resources

1. **S3 Bucket** (`wapsell-assets-prod`):
   ```terraform
   resource "aws_s3_bucket" "assets" {
     bucket = "wapsell-assets-prod"
     
     versioning {
       enabled = true  # For audit trails
     }
     
     server_side_encryption_configuration {
       rule {
         apply_server_side_encryption_by_default {
           sse_algorithm = "AES256"
         }
       }
     }
     
     public_access_block {
       block_public_acls       = true
       block_public_policy     = true
       ignore_public_acls      = true
       restrict_public_buckets = true
     }
   }
   ```

2. **CloudFront Distribution**:
   ```terraform
   resource "aws_cloudfront_distribution" "assets" {
     enabled = true
     
     origin {
       domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
       origin_id   = "S3Origin"
       
       s3_origin_config {
         origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
       }
     }
     
     behaviors = [
       {
         path_pattern = "images/*"
         cache_ttl    = 31536000  # 1 year
         compress     = true
       },
       {
         path_pattern = "videos/*"
         cache_ttl    = 3600      # 1 hour
         compress     = true
       },
       {
         default      = true
         cache_ttl    = 3600      # 1 hour
         compress     = true
       }
     ]
     
     price_class = "PriceClass_100"  # Cheapest tier (US/Europe)
     
     viewer_protocol_policy = "redirect-to-https"
     
     logging_config {
       include_cookies = false
       bucket          = aws_s3_bucket.logs.bucket_domain_name
       prefix          = "cloudfront/"
     }
   }
   ```

3. **IAM User** (for API credentials):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:DeleteObject",
           "s3:GetObject",
           "s3:GetObjectVersion",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::wapsell-assets-prod",
           "arn:aws:s3:::wapsell-assets-prod/*"
         ]
       }
     ]
   }
   ```

## Environment Variables

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=wapsell-assets-prod
AWS_CLOUDFRONT_DOMAIN=d12345abcde.cloudfront.net
AWS_CLOUDFRONT_DISTRIBUTION_ID=E12345ABCDE

# AWS Credentials (for API)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Asset Limits
MAX_FILE_SIZE_MB=50
MAX_MONTHLY_STORAGE_GB=1
```

## DTOs

### UploadAssetDto
```typescript
{
  file: Express.Multer.File,  // In multipart body
  altText?: string            // Optional description
}
```

### ResizeImageDto
```typescript
{
  width: number,              // 1-∞ pixels
  height: number,             // 1-∞ pixels
  format?: 'jpg' | 'png' | 'webp'  // Default: webp
}
```

### AssetResponseDto
```typescript
{
  id: string,
  fileName: string,
  s3Key: string,
  contentType: string,
  size: number,
  cdnUrl: string,
  altText?: string,
  metadata?: { width?, height?, duration?, ... },
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Upload Asset
```
POST /assets/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form:
  file: <binary>
  altText: "Description" (optional)

Response (201):
{
  "id": "cuid123",
  "fileName": "photo.jpg",
  "s3Key": "empresas/e1/1729863000000-photo.jpg",
  "contentType": "image/jpeg",
  "size": 245618,
  "cdnUrl": "https://d12345.cloudfront.net/empresas/e1/1729863000000-photo.jpg",
  "altText": "Description",
  "createdAt": "2026-10-25T12:00:00Z",
  "updatedAt": "2026-10-25T12:00:00Z"
}
```

### List Assets
```
GET /assets?page=1&pageSize=20
Authorization: Bearer {token}

Response (200):
{
  "data": [ { AssetResponseDto }, ... ],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "hasMore": true
}
```

### Get Single Asset
```
GET /assets/{id}
Authorization: Bearer {token}

Response (200): AssetResponseDto
```

### Delete Asset
```
DELETE /assets/{id}
Authorization: Bearer {token}

Response (200):
{ "message": "Asset deleted successfully" }
```

### Generate Signed URL
```
GET /assets/{id}/download?ttl=900
Authorization: Bearer {token}

Response (200):
{
  "signedUrl": "https://d12345.cloudfront.net/...?X-Amz-Signature=...",
  "expiresIn": 900
}
```

### Get Asset Metadata
```
GET /assets/{id}/metadata
Authorization: Bearer {token}

Response (200):
{
  "size": 245618,
  "type": "image/jpeg",
  "uploadedAt": "2026-10-25T12:00:00Z",
  "metadata": { "fileType": "image" }
}
```

### Trigger Image Resize (Future)
```
POST /assets/{id}/resize
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "width": 640,
  "height": 480,
  "format": "webp"
}

Response (201):
{
  "message": "Image resize job queued. Job ID: ...",
  "jobId": "resize-cuid-1729863000000"
}
```

## Testing

### Test Coverage (15+ test cases)

File: `apps/api/test/integration/p12-1-cdn.integration-spec.ts`

**Upload Tests**:
- ✅ Upload image file (JPEG, PNG, GIF, WebP)
- ✅ Upload PDF file
- ✅ Reject invalid file types (.exe, .bat, etc.)
- ✅ Reject files > 50MB
- ✅ Reject when no file provided

**List Tests**:
- ✅ List assets with pagination
- ✅ Return in reverse chronological order
- ✅ Respect page size limits (max 100)
- ✅ Multi-tenant isolation (empresa1 doesn't see empresa2 assets)

**Retrieve Tests**:
- ✅ Get single asset by ID
- ✅ Return 404 for non-existent asset
- ✅ Prevent access from another empresa

**Delete Tests**:
- ✅ Soft-delete asset
- ✅ Asset not listed after deletion
- ✅ Prevent deletion from another empresa

**Download Tests**:
- ✅ Generate signed URL with default TTL
- ✅ Accept custom TTL (with bounds)
- ✅ Enforce minimum TTL (60s)
- ✅ Enforce maximum TTL (1 day)
- ✅ Prevent access from another empresa

**Metadata Tests**:
- ✅ Retrieve metadata (size, type, uploadedAt)
- ✅ Prevent metadata access from another empresa

**Resize Tests**:
- ✅ Trigger resize for images
- ✅ Reject resize for non-images (PDF, etc.)
- ✅ Validate resize dimensions
- ✅ Prevent resize from another empresa

**Authorization Tests**:
- ✅ Reject requests without authentication
- ✅ Reject invalid tokens

### Run Tests

```bash
npm test -- p12-1-cdn.integration-spec
```

## Cost Estimation (Monthly)

For a typical SaaS with 100 empresas, 1000 active users:

| Resource | Usage | Cost |
|----------|-------|------|
| S3 Storage | 50GB | $1.15 |
| S3 Requests (PUT) | 50K | $0.25 |
| S3 Requests (GET) | 500K | $2.50 |
| CloudFront Data Out | 50GB | $4.25 |
| CloudFront Requests | 1M | $0.10 |
| **Total** | | **~$8.25** |

**Note**: Pricing varies by region and data transfer direction. See [AWS pricing calculator](https://calculator.aws/).

## Future Enhancements

### Lambda Integration (P12-2)
```
S3:ObjectCreated event
    ↓
Lambda Function: assets-optimizer
    ├─ Detect image dimensions
    ├─ Generate WebP variants
    ├─ Create resized versions (xs, sm, md, lg)
    └─ Upload to images/optimized/ folder
    
    ↓
Trigger: AssetService.onImageOptimized()
    └─ Update Asset.metadata with URLs
```

### Virus Scanning (P12-3)
```
S3:ObjectCreated event
    ↓
ClamAV Lambda
    ├─ Scan for malware
    └─ Tag object with scan result
    
    ↓
Asset.metadata.virusStatus = "CLEAN" | "INFECTED"
```

### CDN Invalidation (P12-4)
```
DELETE /assets/{id}
    ↓
AssetService.deleteAsset()
    ├─ Delete from S3
    ├─ CloudFront.createInvalidation()
    └─ Mark for cleanup after 24h
```

## Monitoring & Observability

### CloudWatch Metrics

- `AssetUploadTime` — Time to upload (P95, P99)
- `AssetListLatency` — Query time
- `StorageUsageByEmpresa` — Track quota compliance
- `S3GetErrors`, `S3PutErrors` — Error rates

### Logging

- **S3**: Access logs to CloudWatch
- **CloudFront**: Distribution logs to S3 → Athena analysis
- **Application**: AssetService logs via NestJS logger

## Migration Guide

### From Manual File Management

1. **Backup existing files** to S3 manually
2. **Create Asset records** for each file:
   ```typescript
   const asset = await prisma.asset.create({
     data: {
       empresaId, fileName, s3Key, contentType, size,
       cdnUrl, metadata: {}
     }
   });
   ```
3. **Update client URLs** from `/static/...` to `asset.cdnUrl`
4. **Monitor logs** for any 404s during transition

## Troubleshooting

### "File type not allowed"
- Check MIME type detection: `file -b --mime-type file`
- Add to `ALLOWED_MIME_TYPES` in AssetService if legitimate

### "File size exceeds maximum"
- Max single file: 50MB
- Max monthly per empresa: 1GB
- Request storage limit increase via AWS Support

### "Monthly storage limit exceeded"
- Check usage: `prisma.asset.aggregate({ where: { empresaId }, _sum: { size } })`
- Clean up old/unused assets
- Request quota increase

### S3 Connection Errors
- Verify AWS credentials in `.env`
- Check IAM policy (PutObject, DeleteObject, GetObject)
- Verify bucket region matches `AWS_REGION`

## References

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
- [Prisma Multi-tenancy](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries)

