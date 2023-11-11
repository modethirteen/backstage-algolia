import { SearchIndex } from 'algoliasearch';
import { ClientFactory } from '../api/ClientFactory';
import { Config } from '@backstage/config';
import { differenceInSeconds, isValid } from 'date-fns';
import { Logger } from 'winston';
import { parse, toSeconds } from 'iso8601-duration';

interface Expiration {
  source: string;
  ttl: number;
}

export interface IndexManager {
  clean(): Promise<void>;  
}

export interface IndexManagerOptions {
  index: 'techdocs';
  logger: Logger;
}

export class IndexManager implements IndexManager {
  public static fromConfig(config: Config, options: IndexManagerOptions) {
    const { index, logger } = options;
    const client = ClientFactory.fromConfig(config).newClient();
    return new IndexManager({
      expirations: config.getOptionalConfigArray(`algolia.indexes.${index}.expirations`)
        ?.map(c => ({
          source: c.get('source'),
          ttl: toSeconds(parse(c.get('ttl'))),
        })),
      logger,
      now: new Date(),
      searchIndex: client.initIndex(config.getString(`algolia.indexes.${index}.name`)),
    });
  }

  public readonly expirations: Expiration[];
  private readonly logger: Logger;
  private readonly now: Date;
  private readonly searchIndex: SearchIndex;

  public constructor(options: {
    expirations?: Expiration[];
    logger: Logger;
    now: Date;
    searchIndex: SearchIndex;
  }) {
    const { expirations, logger, now, searchIndex } = options;
    this.expirations = expirations ?? [];
    this.logger = logger;
    this.now = now;
    this.searchIndex = searchIndex;
  }

  public async clean() {
    for (const { source, ttl } of this.expirations) {
      await this.searchIndex.browseObjects({
        query: '',
        filters: `source:${source}`,
        attributesToRetrieve: [
          'timestamp',
        ],
        batch: batch => {
          const expiredObjectIDs = batch.filter(o => {
            const { objectID, timestamp } = o as { objectID: string; timestamp: string; };
            const indexDate = new Date(timestamp);
            if (!isValid(indexDate)) {
              this.logger.warn(`Algolia object ${objectID} does not have a valid indexing timestamp and cannot be expired or cleaned`);
              return false;
            }
            return differenceInSeconds(this.now, indexDate) >= ttl;
          }).map(o => o.objectID);
          this.searchIndex.deleteObjects(expiredObjectIDs);
        },
      });
    }
  }
}