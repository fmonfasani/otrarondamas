import { Client, ClientOptions } from '@elastic/elasticsearch';

export const elasticsearchConfig: ClientOptions = {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth:
    process.env.ELASTICSEARCH_USER && process.env.ELASTICSEARCH_PASSWORD
      ? {
          username: process.env.ELASTICSEARCH_USER,
          password: process.env.ELASTICSEARCH_PASSWORD,
        }
      : undefined,
  maxRetries: 3,
  requestTimeout: 5000,
  // For testing: enable SSL verification bypass if needed
  tls:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
};

export const ELASTICSEARCH_INDICES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
};

export const ELASTICSEARCH_SETTINGS = {
  products: {
    settings: {
      number_of_shards: 2,
      number_of_replicas: 1,
      analysis: {
        analyzer: {
          spanish_analyzer: {
            type: 'standard',
            stopwords: '_spanish_',
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        empresaId: { type: 'keyword' },
        nombre: { type: 'text', analyzer: 'spanish_analyzer' },
        descripcion: { type: 'text', analyzer: 'spanish_analyzer' },
        precio: { type: 'float' },
        stock: { type: 'integer' },
        familiaId: { type: 'keyword' },
        familiaName: { type: 'keyword' },
        imagen: { type: 'keyword' },
        tags: { type: 'keyword' },
        activo: { type: 'boolean' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    },
  },
  orders: {
    settings: {
      number_of_shards: 2,
      number_of_replicas: 1,
      analysis: {
        analyzer: {
          spanish_analyzer: {
            type: 'standard',
            stopwords: '_spanish_',
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        empresaId: { type: 'keyword' },
        numero: { type: 'integer' },
        fecha: { type: 'date' },
        total: { type: 'float' },
        estado: { type: 'keyword' },
        clienteNombre: { type: 'text', analyzer: 'spanish_analyzer' },
        clienteEmail: { type: 'keyword' },
        items: {
          type: 'nested',
          properties: {
            productoNombre: { type: 'text' },
            cantidad: { type: 'integer' },
          },
        },
        createdAt: { type: 'date' },
      },
    },
  },
};
