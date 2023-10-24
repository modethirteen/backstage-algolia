import { CatalogApi, CatalogClient } from '@backstage/catalog-client';
import {
  AuthService,
  DiscoveryService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import pLimit from 'p-limit';
import { Readable } from 'stream';
import { CollatorFactory, PipelineResult } from './types';
import { humanizeEntityName } from '../util';

interface CatalogCollatorFactoryDeps {
  discovery: DiscoveryService;
  logger: LoggerService;
  auth: AuthService;
}

export class CatalogCollatorFactory implements CollatorFactory {
  public static fromConfig(config: Config, deps: CatalogCollatorFactoryDeps) {
    const kinds = config.getOptionalStringArray(
      'algolia.backend.indexes.catalog.kinds',
    );
    const parallelismLimit = config.getOptionalNumber(
      'algolia.backend.indexes.catalog.parallelismLimit',
    );
    return new CatalogCollatorFactory({
      ...deps,
      kinds,
      parallelismLimit,
    });
  }

  private readonly catalogClient: CatalogApi;
  private readonly kinds: string[];
  private readonly logger: LoggerService;
  private readonly parallelismLimit: number;
  private readonly auth: AuthService;

  public constructor(
    deps: CatalogCollatorFactoryDeps & {
      kinds?: string[];
      parallelismLimit?: number;
    },
  ) {
    const { discovery, kinds, logger, parallelismLimit, auth } = deps;
    this.catalogClient = new CatalogClient({ discoveryApi: discovery });
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
    this.auth = auth;
  }

  public async newCollator(): Promise<Readable> {
    return Readable.from(this.execute());
  }

  private async *execute(): AsyncGenerator<PipelineResult, void, undefined> {
    const limit = pLimit(this.parallelismLimit);
    let entitiesRetrieved = 0;
    let moreEntitiesToGet = true;
    const batchSize = this.parallelismLimit * 50;
    while (moreEntitiesToGet) {
      this.logger.debug(`Loading next batch of ${batchSize} entities`);
      const { token } = await this.auth.getPluginRequestToken({
        onBehalfOf: await this.auth.getOwnServiceCredentials(),
        targetPluginId: 'catalog',
      });
      const entities = (
        await this.catalogClient.getEntities(
          {
            filter: {
              kind: this.kinds,
            },
            limit: batchSize,
            offset: entitiesRetrieved,
          },
          { token },
        )
      ).items;

      // control looping through entity batches.
      moreEntitiesToGet = entities.length === batchSize;
      entitiesRetrieved += entities.length;
      const promises = entities.map((entity: Entity) =>
        limit(
          async (): Promise<PipelineResult> => ({
            entity,
            indexObject: {
              source: 'catalog',
              title: humanizeEntityName(entity),
              text: entity.metadata.description ?? '',
              location: '',
              path: '',
              keywords: [],
              ...(entity.metadata.tags ? { tags: entity.metadata.tags } : {}),
            },
          }),
        ),
      );
      yield* await Promise.all(promises);
    }
  }
}
