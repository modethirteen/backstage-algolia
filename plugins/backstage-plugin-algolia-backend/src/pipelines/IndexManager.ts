import { Config } from '@backstage/config';
import { SearchIndex } from 'algoliasearch';
import { IndexObjectWithIdAndTimestamp } from 'backstage-plugin-algolia-common';
import { differenceInSeconds, isValid } from 'date-fns';
import { parse, toSeconds } from 'iso8601-duration';
import { Logger } from 'winston';
import { ClientFactory } from '../api/ClientFactory';

interface Expiration {
  source: string;
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
  logger: Logger;
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
          source: c.get('source'),
          ttl: toSeconds(parse(c.get('ttl')), date),
        })) ?? [];
    return new IndexManager({
      expirations: filter?.sources
        ? expirations.filter(({ source }) => filter.sources?.includes(source))
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
  private readonly logger: Logger;
  private readonly now: Date;

  public constructor(options: {
    expirations: Expiration[];
    logger: Logger;
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
    for (const { source, ttl } of this.expirations) {
      await this.searchIndex.browseObjects({
        query: '',
        filters: `source:${source}`,
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
