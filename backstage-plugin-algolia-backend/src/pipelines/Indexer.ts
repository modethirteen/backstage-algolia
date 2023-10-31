import { assertError } from '@backstage/errors';
import { Writable } from 'stream';
import { Config } from '@backstage/config';
import algoliasearch, { SearchIndex } from 'algoliasearch';
import { IndexObject } from './types';
import { Logger } from 'winston';

export interface IndexerOptions {
  batchSize: number;
  index: 'techdocs';
  logger: Logger;
}

export class Indexer extends Writable {
  public static fromConfig(config: Config, options: IndexerOptions) {
    const { batchSize, index, logger } = options;
    return new Indexer({
      apikey: config.getString('algolia.apikey'),
      applicationId: config.getString('algolia.applicationId'),
      batchSize,
      index: config.getString(`algolia.indexes.${index}.name`),
      logger,
      maxObjectSizeBytes: config.getNumber('algolia.maxObjectSizeBytes'),
    });
  }

  private readonly batchSize: number;
  private currentBatch: IndexObject[] = [];
  private readonly logger: Logger;
  private readonly maxObjectSizeBytes: number;
  private readonly searchIndex: SearchIndex;

  private constructor(options: {
    apikey: string;
    applicationId: string;
    batchSize: number;
    index: string;
    logger: Logger;
    maxObjectSizeBytes: number;
  }) {
    super({ objectMode: true });
    const { apikey, applicationId, batchSize, index, logger, maxObjectSizeBytes } = options;
    this.batchSize = batchSize;
    this.logger = logger;
    this.maxObjectSizeBytes = maxObjectSizeBytes;
    const client = algoliasearch(applicationId, apikey);
    this.searchIndex = client.initIndex(index);
  }

  public async index(objects: IndexObject[]): Promise<void> {
    this.logger.debug(`Preparing to send ${objects.length} objects to Algolia`);
    await this.searchIndex.saveObjects(
      objects.map(o => {
        const length = Buffer.from(JSON.stringify(o), 'utf-8').length;
        if (length <= this.maxObjectSizeBytes) {
          return o;
        }
        this.logger.debug(`Object ${o.objectID} with location ${o.location} is ${length} bytes and larger than the maximum allowed length of ${this.maxObjectSizeBytes} bytes`);
        return undefined;
      }).filter(o => o) as IndexObject[]
    );
  }

  /**
   * @internal
   */
  async _write(
    object: IndexObject,
    _e: any,
    done: (error?: Error | null) => void,
  ) {
    this.currentBatch.push(object);
    if (this.currentBatch.length < this.batchSize) {
      done();
      return;
    }
    try {
      await this.index(this.currentBatch);
      this.currentBatch = [];
      done();
    } catch (e) {
      assertError(e);
      this.logger.error(e.message);
      done(e);
    }
  }

  /**
   * @internal
   */
  async _final(done: (error?: Error | null) => void) {
    try {
      if (this.currentBatch.length) {
        await this.index(this.currentBatch);
        this.currentBatch = [];
      }
      done();
    } catch (e) {
      assertError(e);
      this.logger.error(e.message);
      done(e);
    }
  }
}
