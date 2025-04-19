import { PluginEndpointDiscovery, TokenManager } from '@backstage/backend-common';
import {
  CatalogApi,
  CatalogClient,
} from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import pLimit from 'p-limit';
import { Readable } from 'stream';
import { Logger } from 'winston';
import {
  CollatorFactory,
  PipelineResult,
} from './types';
import { humanizeEntityName } from '../util';

export interface CatalogCollatorFactoryOptions {
  catalogClient?: CatalogApi;
  discovery: PluginEndpointDiscovery;
  logger: Logger;
  tokenManager: TokenManager;
}

export class CatalogCollatorFactory implements CollatorFactory {
  public static fromConfig(config: Config, options: CatalogCollatorFactoryOptions) {
    const kinds = config.getOptionalStringArray('algolia.backend.indexes.catalog.kinds');
    const parallelismLimit = config.getOptionalNumber('algolia.backend.indexes.catalog.parallelismLimit');
    return new CatalogCollatorFactory({
      ...options,
      kinds,
      parallelismLimit,
    });
  }

  private readonly catalogClient: CatalogApi;
  private readonly kinds: string[];
  private readonly logger: Logger;
  private readonly parallelismLimit: number;
  private readonly tokenManager: TokenManager;

  public constructor(options: CatalogCollatorFactoryOptions & {
    kinds?: string[];
    parallelismLimit?: number;
  }) {
    const { catalogClient, discovery, kinds, logger, parallelismLimit, tokenManager } = options;
    this.catalogClient = catalogClient ?? new CatalogClient({ discoveryApi: discovery });
    this.kinds = kinds ?? [
      'api',
      'component',
      'domain',
      'group',
      'resource',
      'system',
      'user',
    ];
    this.logger = logger;
    this.parallelismLimit = parallelismLimit ?? 10;
    this.tokenManager = tokenManager;
  }

  public async newCollator(): Promise<Readable> {
    return Readable.from(this.execute());
  }

  private async * execute(): AsyncGenerator<PipelineResult, void, undefined> {
    const limit = pLimit(this.parallelismLimit);
    const { token } = await this.tokenManager.getToken();
    let entitiesRetrieved = 0;
    let moreEntitiesToGet = true;
    const batchSize = this.parallelismLimit * 50;
    while (moreEntitiesToGet) {
      this.logger.debug(`Loading next batch of ${batchSize} entities`);
      const entities = (
        await this.catalogClient.getEntities({
          filter: {
            kind: this.kinds,
          },
          limit: batchSize,
          offset: entitiesRetrieved,
        }, { token })
      ).items;

      // control looping through entity batches.
      moreEntitiesToGet = entities.length === batchSize;
      entitiesRetrieved += entities.length;
      const promises = entities.map((entity: Entity) => limit(async(): Promise<PipelineResult> => ({
        entity,
        indexObject: {
          source: 'catalog',
          title: humanizeEntityName(entity),
          text: entity.metadata.description ?? '',
          location: '',
          path: '',
          keywords: [],
          ...(entity.metadata.tags ? { tags: entity.metadata.tags } : {}),
        }
      })));
      yield * (await Promise.all(promises));
    }
  }
}
