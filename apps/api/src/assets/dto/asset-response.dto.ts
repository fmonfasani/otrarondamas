export class AssetResponseDto {
  id: string;
  fileName: string;
  s3Key: string;
  contentType: string;
  size: number;
  cdnUrl: string;
  altText?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<AssetResponseDto>) {
    Object.assign(this, partial);
  }
}

export class AssetListResponseDto {
  data: AssetResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
