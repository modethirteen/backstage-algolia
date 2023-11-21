import { PluginEndpointDiscovery, TokenManager } from '@backstage/backend-common';
import {
  CATALOG_FILTER_EXISTS,
  CatalogApi,
  CatalogClient,
} from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { assertError } from '@backstage/errors';
import pLimit from 'p-limit';
import { Readable } from 'stream';
import { Logger } from 'winston';
import {
  CollatorFactory,
  CollatorResult,
  IndexableDocument,
} from './types';

export interface TechDocsCollatorFactoryOptions {
  catalogClient?: CatalogApi;
  discovery: PluginEndpointDiscovery;
  logger: Logger;
  tokenManager: TokenManager;
}

export class TechDocsCollatorFactory implements CollatorFactory {
  public static fromConfig(config: Config, options: TechDocsCollatorFactoryOptions) {
    const parallelismLimit = config.getOptionalNumber('algolia.indexes.techdocs.parallelismLimit');
    return new TechDocsCollatorFactory({
      ...options,
      parallelismLimit,
    });
  }

  private readonly catalogClient: CatalogApi;
  private readonly discovery: PluginEndpointDiscovery;
  private readonly logger: Logger;
  private readonly parallelismLimit: number;
  private readonly tokenManager: TokenManager;

  public constructor(options: TechDocsCollatorFactoryOptions & {
    parallelismLimit?: number;
  }) {
    this.catalogClient = options.catalogClient ?? new CatalogClient({ discoveryApi: options.discovery });
    this.discovery = options.discovery;
    this.logger = options.logger;
    this.parallelismLimit = options.parallelismLimit ?? 10;
    this.tokenManager = options.tokenManager;
  }

  public async newCollator(): Promise<Readable> {
    return Readable.from(this.execute());
  }

  private async * execute(): AsyncGenerator<CollatorResult, void, undefined> {
    const limit = pLimit(this.parallelismLimit);
    const techDocsBaseUrl = await this.discovery.getBaseUrl('techdocs');
    const { token } = await this.tokenManager.getToken();
    let entitiesRetrieved = 0;
    let moreEntitiesToGet = true;
    const batchSize = this.parallelismLimit * 50;
    while (moreEntitiesToGet) {
      this.logger.debug(`Loading next batch of ${batchSize} entities for retrieving search indexes`);
      const entities = (
        await this.catalogClient.getEntities({
          filter: {
            'metadata.annotations.backstage.io/techdocs-ref': CATALOG_FILTER_EXISTS,
          },
          limit: batchSize,
          offset: entitiesRetrieved,
        }, { token })
      ).items;

      // Control looping through entity batches.
      moreEntitiesToGet = entities.length === batchSize;
      entitiesRetrieved += entities.length;
      const promises = entities

        // only entities with techdocs refs were fetched, but they may be null values
        .filter(entity => entity.metadata.annotations?.['backstage.io/techdocs-ref'])
        .map((entity: Entity) =>
          limit(async(): Promise<CollatorResult[]> => {
            const entityInfo = {
              kind: entity.kind,
              namespace: entity.metadata.namespace ?? 'default',
              name: entity.metadata.name,
            };
            try {
              const response = await fetch(
                `${techDocsBaseUrl}/static/docs/${entityInfo.namespace}/${entityInfo.kind}/${entityInfo.name}/search/search_index.json`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const searchIndex = await response.json() as { docs: IndexableDocument[] };
              this.logger.debug(`Retrieved ${searchIndex.docs.length} mkdocs search index items for entity ${entityInfo.namespace}/${entityInfo.kind}/${entityInfo.name}`);
              return searchIndex.docs.map(doc => ({ entity, doc, source: 'mkdocs' }));
            } catch (e) {
              assertError(e);
              this.logger.warn(`Failed to retrieve mkdocs search index for entity ${entityInfo.namespace}/${entityInfo.kind}/${entityInfo.name}`, e);
              return [];
            }
          }),
        );
      yield * (await Promise.all(promises)).flat();
    }
  }
}
