import { assertError, isError } from '@backstage/errors';
import { Writable } from 'stream';
import { Config } from '@backstage/config';
import { SearchIndex } from 'algoliasearch';
import { IndexObject, IndexObjectWithIdAndTimestamp } from './types';
import { Logger } from 'winston';
import { ClientFactory } from '../api/ClientFactory';
import crypto from 'crypto';

const isTextRemaining = (text: string) => text.replace(/^\s+|\s+$/g, '').length;

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
      chunk: config.getOptionalBoolean('algolia.chunk') ?? false,
      logger,
      maxObjectSizeBytes: config.getNumber('algolia.maxObjectSizeBytes'),
      now: new Date(),
      searchIndex: client.initIndex(config.getString(`algolia.indexes.${index}.name`)),
    });
  }

  private readonly batchSize: number;
  private readonly chunk: boolean;
  private currentBatch: IndexObject[] = [];
  private readonly logger: Logger;
  private readonly maxObjectSizeBytes: number;
  private readonly now: Date;
  private readonly searchIndex: SearchIndex;

  public constructor(options: {
    batchSize: number;
    chunk: boolean;
    logger: Logger;
    maxObjectSizeBytes: number;
    now: Date;
    searchIndex: SearchIndex;
  }) {
    super({ objectMode: true });
    const { batchSize, chunk, logger, maxObjectSizeBytes, now, searchIndex } = options;
    this.batchSize = batchSize;
    this.chunk = chunk;
    this.logger = logger;
    this.maxObjectSizeBytes = maxObjectSizeBytes;
    this.now = now;
    this.searchIndex = searchIndex;
  }

  public async index(objects: IndexObject[]): Promise<void> {
    this.logger.debug(`Preparing to send ${objects.length} object(s) to Algolia`);
    const filteredObjects = objects.filter(o => o).map(o => {
      const results: IndexObjectWithIdAndTimestamp[] = [];
      try {
        const { location  } = o;
        if (this.chunk) {
          let { text } = o;        
          let chunks = 0;
          while (isTextRemaining(text)) {

            // extract chunk without splitting words
            const chunk = text.replace(/^(.{1000}[^\s]*).*/, '$1');          
            text = text.substring(chunk.length);

            // ensure object is unique by original location and chunk cursor. the location
            // is the distinct field that unifies chunks in the index under one search result
            results.push(this.newIndexObjectWithIdAndTimestamp(location + chunks, {
              ...o,
              text: chunk,
            }));
            chunks++;
          }
        } else {
          results.push(this.newIndexObjectWithIdAndTimestamp(location, o));
        }
      } catch(e) {
        if (isError(e)) {
          this.logger.warn(`Object with location ${o.location ?? 'unknown'} could not be prepared to send to Algolia: ${e.message}`);
          return [undefined];
        }
        throw e;
      }
      return results.map(r => {
        const length = Buffer.from(JSON.stringify(r), 'utf-8').length;
        if (length <= this.maxObjectSizeBytes) {
          return r;
        }
        this.logger.debug(`Object ${r.objectID} with location ${r.location} is ${length} bytes and larger than the maximum allowed length of ${this.maxObjectSizeBytes} bytes`);
        return undefined;
      }).filter(r => r);
    })
    .flat() as IndexObjectWithIdAndTimestamp[];
    if (filteredObjects.length) {
      try {
        this.logger.debug(`Sending ${filteredObjects.length} object(s) to Algolia`);
        await this.searchIndex.saveObjects(filteredObjects);
      } catch (e) {
        if (isError(e)) {
          this.logger.warn(`There was a problem sending object(s) to Algolia: ${e.message}`);
        } else {
          throw e;
        }
      }
    }
  }

  /**
   * @internal
   */
  async _write(
    object: IndexObject | undefined,
    _e: any,
    done: (error?: Error | null) => void,
  ) {
    if (typeof object === 'undefined') {
      return;
    }
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

  private newIndexObjectWithIdAndTimestamp(key: string, object: IndexObject): IndexObjectWithIdAndTimestamp {
    const hash = crypto.createHash('sha256');
    hash.update(key);
    const objectID = hash.digest('hex');
    return {
      ...object,
      objectID,
      timestamp: this.now.toISOString(),
    };  
  }
}
