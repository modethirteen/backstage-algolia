import {
  CATALOG_FILTER_EXISTS,
  CatalogApi,
  CatalogClient,
} from '@backstage/catalog-client';
import {
  Entity,
  getCompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { assertError } from '@backstage/errors';
import { Readable } from 'stream';
import { CollatorFactory, PipelineResult } from './types';
import { unescape } from 'lodash';
import {
  AuthService,
  DiscoveryService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import limitFactory from 'p-limit';

interface Document {
  title: string;
  text: string;
  location: string;
}

interface TechDocsCollatorFactoryDeps {
  auth: AuthService;
  discovery: DiscoveryService;
  logger: LoggerService;
}

export class TechDocsCollatorFactory implements CollatorFactory {
  public static fromConfig(config: Config, deps: TechDocsCollatorFactoryDeps) {
    const parallelismLimit = config.getOptionalNumber(
      'algolia.backend.indexes.techdocs.parallelismLimit',
    );
    return new TechDocsCollatorFactory({
      ...deps,
      parallelismLimit,
    });
  }

  private readonly catalogClient: CatalogApi;
  private readonly discovery: DiscoveryService;
  private readonly logger: LoggerService;
  private readonly parallelismLimit: number;
  private readonly auth: AuthService;

  public constructor(
    deps: TechDocsCollatorFactoryDeps & {
      parallelismLimit?: number;
    },
  ) {
    const { discovery, logger, parallelismLimit, auth } = deps;
    this.catalogClient = new CatalogClient({ discoveryApi: discovery });
    this.discovery = discovery;
    this.logger = logger;
    this.parallelismLimit = parallelismLimit ?? 10;
    this.auth = auth;
  }

  public async newCollator(): Promise<Readable> {
    return Readable.from(this.execute());
  }

  private async *execute(): AsyncGenerator<PipelineResult, void, undefined> {
    const limit = limitFactory(this.parallelismLimit);
    const techDocsBaseUrl = await this.discovery.getBaseUrl('techdocs');
    let entitiesRetrieved = 0;
    let moreEntitiesToGet = true;
    const batchSize = this.parallelismLimit * 50;
    while (moreEntitiesToGet) {
      this.logger.debug(
        `Loading next batch of ${batchSize} entities for retrieving search indexes`,
      );
      const { token } = await this.auth.getPluginRequestToken({
        onBehalfOf: await this.auth.getOwnServiceCredentials(),
        targetPluginId: 'catalog',
      });
      const entities = (
        await this.catalogClient.getEntities(
          {
            filter: {
              'metadata.annotations.backstage.io/techdocs-ref':
                CATALOG_FILTER_EXISTS,
            },
            limit: batchSize,
            offset: entitiesRetrieved,
          },
          { token },
        )
      ).items;

      // Control looping through entity batches.
      moreEntitiesToGet = entities.length === batchSize;
      entitiesRetrieved += entities.length;
      const promises = entities

        // only entities with techdocs refs were fetched, but they may be null values
        .filter(
          entity => entity.metadata.annotations?.['backstage.io/techdocs-ref'],
        )
        .map((entity: Entity) =>
          limit(async (): Promise<PipelineResult[]> => {
            const entityInfo = {
              kind: entity.kind,
              namespace: entity.metadata.namespace ?? 'default',
              name: entity.metadata.name,
            };
            let searchIndex: { docs: Document[] };
            try {
              const { token } = await this.auth.getPluginRequestToken({
                onBehalfOf: await this.auth.getOwnServiceCredentials(),
                targetPluginId: 'techdocs',
              });
              const response = await fetch(
                `${techDocsBaseUrl}/static/docs/${entityInfo.namespace}/${entityInfo.kind}/${entityInfo.name}/search/search_index.json`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );
              searchIndex = await response.json();
            } catch (e) {
              assertError(e);
              this.logger.warn(
                `Failed to retrieve mkdocs search index for entity ${stringifyEntityRef(
                  entityInfo,
                )}`,
                e,
              );
              return [];
            }
            this.logger.debug(
              `Retrieved ${
                searchIndex.docs.length
              } mkdocs search index items for entity ${stringifyEntityRef(
                entityInfo,
              )}`,
            );
            let data: object = {};
            try {
              const { token } = await this.auth.getPluginRequestToken({
                onBehalfOf: await this.auth.getOwnServiceCredentials(),
                targetPluginId: 'techdocs',
              });
              const response = await fetch(
                `${techDocsBaseUrl}/static/docs/${entityInfo.namespace}/${entityInfo.kind}/${entityInfo.name}/techdocs_metadata.json`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );
              data = await response.json();
            } catch (e) {
              this.logger.warn(
                `Failed to retrieve techdocs metadata for entity ${stringifyEntityRef(
                  entityInfo,
                )}`,
                e,
              );
            }
            return searchIndex.docs.map(doc => {
              return {
                entity,
                indexObject: {
                  type: 'techdocs',
                  title: unescape(doc.title),
                  text: unescape(doc.text ?? ''),
                  location: doc.location,
                  path: doc.location,
                  keywords: [],
                  ...getCompoundEntityRef(entity),
                },
                data,
              };
            });
          }),
        );
      yield* (await Promise.all(promises)).flat();
    }
  }
}
