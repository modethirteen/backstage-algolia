import { assertError } from '@backstage/errors';
import { Writable } from 'stream';
import { Config } from '@backstage/config';
import { SearchIndex } from 'algoliasearch';
import { IndexObject } from './types';
import { Logger } from 'winston';
import { ClientFactory } from './ClientFactory';

export interface IndexerOptions {
  batchSize: number;
  index: 'techdocs';
  logger: Logger;
}

export class Indexer extends Writable {
  public static fromConfig(config: Config, options: IndexerOptions) {
    const { batchSize, index, logger } = options;
    const client = ClientFactory.fromConfig(config).newClient();
    return new Indexer({
      batchSize,
      logger,
      maxObjectSizeBytes: config.getNumber('algolia.maxObjectSizeBytes'),
      now: new Date(),
      searchIndex: client.initIndex(config.getString(`algolia.indexes.${index}.name`)),
    });
  }

  private readonly batchSize: number;
  private currentBatch: IndexObject[] = [];
  private readonly logger: Logger;
  private readonly maxObjectSizeBytes: number;
  private readonly now: Date;
  private readonly searchIndex: SearchIndex;

  public constructor(options: {
    batchSize: number;
    logger: Logger;
    maxObjectSizeBytes: number;
    now: Date;
    searchIndex: SearchIndex;
  }) {
    super({ objectMode: true });
    const { batchSize, logger, maxObjectSizeBytes, now, searchIndex } = options;
    this.batchSize = batchSize;
    this.logger = logger;
    this.maxObjectSizeBytes = maxObjectSizeBytes;
    this.now = now;
    this.searchIndex = searchIndex;
  }

  public async index(objects: IndexObject[]): Promise<void> {
    this.logger.debug(`Preparing to send ${objects.length} objects to Algolia`);
    await this.searchIndex.saveObjects(
      objects.map(o => {
        const length = Buffer.from(JSON.stringify(o), 'utf-8').length;
        if (length <= this.maxObjectSizeBytes) {
          return {
            ...o,
            timestamp: this.now.toISOString(),
          };
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
