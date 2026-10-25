import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetService } from './asset.service';
import {
  UploadAssetDto,
  ResizeImageDto,
  AssetResponseDto,
  AssetListResponseDto,
} from './dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { GetBusinessContext } from '../business-context/extract-business-context.decorator';

@Controller('assets')
export class AssetController {
  constructor(private assetService: AssetService) {}

  /**
   * POST /assets/upload
   * Upload a file (image, PDF, video, etc.)
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('asset:upload')
  async uploadAsset(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAssetDto,
    @GetBusinessContext() businessContext: { empresaId: string },
  ): Promise<AssetResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.assetService.uploadAsset(
      file,
      businessContext.empresaId,
      dto.altText,
    );
  }

  /**
   * GET /assets
   * List all assets for the current empresa (paginated)
   */
  @Get()
  @RequirePermission('asset:read')
  async listAssets(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @GetBusinessContext() businessContext: { empresaId: string },
  ): Promise<AssetListResponseDto> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));

    return this.assetService.listAssets(
      businessContext.empresaId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * GET /assets/:id
   * Get a single asset by ID
   */
  @Get(':id')
  @RequirePermission('asset:read')
  async getAsset(
    @Param('id') assetId: string,
    @GetBusinessContext() businessContext: { empresaId: string },
  ): Promise<AssetResponseDto> {
    return this.assetService.getAsset(assetId, businessContext.empresaId);
  }

  /**
   * DELETE /assets/:id
   * Delete an asset
   */
  @Delete(':id')
  @RequirePermission('asset:delete')
  async deleteAsset(
    @Param('id') assetId: string,
    @GetBusinessContext() businessContext: { empresaId: string },
  ): Promise<{ message: string }> {
    await this.assetService.deleteAsset(assetId, businessContext.empresaId);
    return { message: 'Asset deleted successfully' };
  }

  /**
   * GET /assets/:id/download
   * Generate a signed URL for private download
   */
  @Get(':id/download')
  @RequirePermission('asset:download')
  async downloadAsset(
    @Param('id') assetId: string,
    @Query('ttl') ttl: string = '900',
    @GetBusinessContext() businessContext: { empresaId: string },
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    const ttlSeconds = Math.max(60, Math.min(86400, parseInt(ttl, 10) || 900));
    return this.assetService.generateSignedUrl(
      assetId,
      businessContext.empresaId,
      ttlSeconds,
    );
  }

  /**
   * GET /assets/:id/metadata
   * Get asset metadata (size, type, etc.)
   */
  @Get(':id/metadata')
  @RequirePermission('asset:read')
  async getMetadata(
    @Param('id') assetId: string,
    @GetBusinessContext() businessContext: { empresaId: string },
  ): Promise<any> {
    return this.assetService.getAssetMetadata(assetId, businessContext.empresaId);
  }

  /**
   * POST /assets/:id/resize
   * Trigger image resize job (future Lambda integration)
   */
  @Post(':id/resize')
  @RequirePermission('asset:resize')
  async resizeImage(
    @Param('id') assetId: string,
    @Body() dto: ResizeImageDto,
    @GetBusinessContext() businessContext: { empresaId: string },
  ): Promise<{ message: string; jobId: string }> {
    return this.assetService.triggerImageResize(
      assetId,
      businessContext.empresaId,
      dto.width,
      dto.height,
      dto.format,
    );
  }
}
