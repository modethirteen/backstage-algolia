import { PluginEndpointDiscovery, TokenManager } from '@backstage/backend-common';
import {
  CATALOG_FILTER_EXISTS,
  CatalogApi,
  CatalogClient,
} from '@backstage/catalog-client';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { assertError } from '@backstage/errors';
import pLimit from 'p-limit';
import { Readable } from 'stream';
import { Logger } from 'winston';
import {
  CollatorFactory,
  PipelineResult,
} from './types';
import { unescape } from 'lodash';

const getKeywords = (doc: Document, docs: Document[]) => {
  const { location } = doc;

  // build list of parent paths to fetch parent paths and titles
  const parts = location.split('/').filter(p => p);
  const keywords: string[] = [...parts];
  const root = docs.find(({ location }) => location === '')?.title;
  if (root && root !== doc.title) {
    keywords.push(root);
  }
  for (let i = 0; i < parts.length; i++) {
    let path = parts.slice(0, i + 1).join('/');
    if (!path.includes('#')) {
      path = `${path}/`;
    }
    const title = docs.find(({ location }) => location === path)?.title;
    if (title && title !== doc.title) {
      keywords.push(title);
    }
  }
  return Array.from(
    new Set(
      keywords
        .map(t =>
          t
            .toLocaleLowerCase('en-US')
            .replaceAll(/[^a-zA-Z']+/g, ' ')
            .trim(),
        )
    ),
  );
}

interface Document {
  title: string;
  text: string;
  location: string;
}

export interface TechDocsCollatorFactoryOptions {
  catalogClient?: CatalogApi;
  discovery: PluginEndpointDiscovery;
  logger: Logger;
  tokenManager: TokenManager;
}

export class TechDocsCollatorFactory implements CollatorFactory {
  public static fromConfig(config: Config, options: TechDocsCollatorFactoryOptions) {
    const parallelismLimit = config.getOptionalNumber('algolia.backend.indexes.techdocs.parallelismLimit');
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

  private async * execute(): AsyncGenerator<PipelineResult, void, undefined> {
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
          limit(async(): Promise<PipelineResult[]> => {
            const entityInfo = {
              kind: entity.kind,
              namespace: entity.metadata.namespace ?? 'default',
              name: entity.metadata.name,
            };
            let searchIndex: { docs: Document[] };
            try {
              const response = await fetch(
                `${techDocsBaseUrl}/static/docs/${entityInfo.namespace}/${entityInfo.kind}/${entityInfo.name}/search/search_index.json`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              searchIndex = await response.json();
            } catch (e) {
              assertError(e);
              this.logger.warn(`Failed to retrieve mkdocs search index for entity ${stringifyEntityRef(entityInfo)}`, e);
              return [];
            }
            this.logger.debug(`Retrieved ${searchIndex.docs.length} mkdocs search index items for entity ${stringifyEntityRef(entityInfo)}`);
            let data: object = {};
            try {
              const response = await fetch(
                `${techDocsBaseUrl}/static/docs/${entityInfo.namespace}/${entityInfo.kind}/${entityInfo.name}/techdocs_metadata.json`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              data = await response.json();
            } catch (e) {
              this.logger.warn(`Failed to retrieve techdocs metadata for entity ${stringifyEntityRef(entityInfo)}`, e);
            }
            return searchIndex.docs.map(doc => {
              return {
                entity,
                indexObject: {
                  source: 'mkdocs',
                  title: unescape(doc.title),
                  text: unescape(doc.text ?? ''),
                  location: doc.location,
                  keywords: getKeywords(doc, searchIndex.docs),
                },
                data,
              };
            });
          })
        );
      yield * (await Promise.all(promises)).flat();
    }
  }
}
