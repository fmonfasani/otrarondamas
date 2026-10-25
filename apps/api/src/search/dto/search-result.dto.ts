export class SearchResultItemDto {
  id: string;
  nombre?: string;
  numero?: number;
  descripcion?: string;
  precio?: number;
  stock?: number;
  familiaName?: string;
  clienteNombre?: string;
  estado?: string;
  total?: number;
  [key: string]: any;
}

export class FacetDto {
  key: string;
  count: number;
}

export class SearchResultDto {
  items: SearchResultItemDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets?: {
    familias?: FacetDto[];
    priceRanges?: FacetDto[];
    status?: FacetDto[];
  };
}
