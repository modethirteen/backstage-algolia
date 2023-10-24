import { Config } from '@backstage/config';
import { SearchIndex } from 'algoliasearch';
import { IndexObjectWithIdAndTimestamp } from 'backstage-plugin-algolia-common';
import { differenceInSeconds, isValid } from 'date-fns';
import { parse, toSeconds } from 'iso8601-duration';
import { ClientFactory } from '../api/ClientFactory';
import { LoggerService } from '@backstage/backend-plugin-api';

interface Expiration {
  type: string;
  ttl: number;
}

export interface IndexManagerInterface {
  readonly searchIndex: SearchIndex;
  readonly expirations: Expiration[];
  clean(): Promise<void>;
}

export interface IndexManagerOptions {
  date: Date;
  index: string;
  logger: LoggerService;
  filter?: {
    sources?: string[];
  };
}

export class IndexManager implements IndexManagerInterface {
  public static fromConfig(config: Config, options: IndexManagerOptions) {
    const { date, index, logger, filter } = options;
    const client = ClientFactory.fromConfig(config).newSearchClient();
    const expirations: Expiration[] =
      config
        .getOptionalConfigArray(`algolia.backend.indexes.${index}.expirations`)
        ?.map(c => ({
          type: c.get('type'),
          ttl: toSeconds(parse(c.get('ttl')), date),
        })) ?? [];
    return new IndexManager({
      expirations: filter?.sources
        ? expirations.filter(({ type }) => filter.sources?.includes(type))
        : expirations,
      logger,
      now: new Date(),
      searchIndex: client.initIndex(
        config.getString(`algolia.backend.indexes.${index}.name`),
      ),
    });
  }

  public readonly searchIndex: SearchIndex;
  public readonly expirations: Expiration[];
  private readonly logger: LoggerService;
  private readonly now: Date;

  public constructor(options: {
    expirations: Expiration[];
    logger: LoggerService;
    now: Date;
    searchIndex: SearchIndex;
  }) {
    const { expirations, logger, now, searchIndex } = options;
    this.expirations = expirations;
    this.logger = logger;
    this.now = now;
    this.searchIndex = searchIndex;
  }

  public async clean() {
    for (const { type, ttl } of this.expirations) {
      await this.searchIndex.browseObjects({
        query: '',
        filters: `type:${type}`,
        attributesToRetrieve: ['timestamp'],
        batch: batch => {
          const expiredObjectIDs = batch
            .filter(o => {
              const { objectID, timestamp } =
                o as IndexObjectWithIdAndTimestamp;
              const indexDate = new Date(timestamp);
              if (!isValid(indexDate)) {
                this.logger.warn(
                  `Algolia object ${objectID} does not have a valid indexing timestamp and cannot be expired or cleaned`,
                );
                return false;
              }
              return differenceInSeconds(this.now, indexDate) >= ttl;
            })
            .map(o => o.objectID);
          this.searchIndex.deleteObjects(expiredObjectIDs);
        },
      });
    }
  }
}
