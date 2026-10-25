import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { elasticsearchConfig } from './elasticsearch.config';

@Injectable()
export class ElasticsearchClient {
  private client: Client;
  private logger = new Logger('ElasticsearchClient');

  constructor() {
    this.client = new Client(elasticsearchConfig);
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      this.logger.log('Elasticsearch connected');
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch', error);
      return false;
    }
  }

  async createIndex(indexName: string, settings: any): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (!exists) {
        await this.client.indices.create({
          index: indexName,
          body: settings,
        });
        this.logger.log(`Index ${indexName} created`);
      }
    } catch (error) {
      this.logger.error(`Failed to create index ${indexName}`, error);
      throw error;
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists) {
        await this.client.indices.delete({ index: indexName });
        this.logger.log(`Index ${indexName} deleted`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete index ${indexName}`, error);
      throw error;
    }
  }

  async index(indexName: string, document: any, id?: string): Promise<string> {
    try {
      const response = await this.client.index({
        index: indexName,
        id,
        body: document,
      });
      return response._id;
    } catch (error) {
      this.logger.error(`Failed to index document in ${indexName}`, error);
      throw error;
    }
  }

  async delete(indexName: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index: indexName,
        id,
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete document ${id} from ${indexName}`,
        error,
      );
      throw error;
    }
  }

  async search(indexName: string, query: any): Promise<any> {
    try {
      const response = await this.client.search({
        index: indexName,
        body: query,
      });
      return response;
    } catch (error) {
      this.logger.error(`Failed to search in ${indexName}`, error);
      throw error;
    }
  }

  async bulk(operations: any[]): Promise<any> {
    try {
      const response = await this.client.bulk({
        body: operations,
      });
      return response;
    } catch (error) {
      this.logger.error('Failed to execute bulk operation', error);
      throw error;
    }
  }

  async getClient(): Promise<Client> {
    return this.client;
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    this.logger.log('Elasticsearch client disconnected');
  }
}
