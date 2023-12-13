import { Config } from '@backstage/config';
import { unescape } from 'lodash';
import * as url from 'url';
import { BuilderBase } from './BuilderBase';
import { entityRefsBuilder } from './entityRefsBuilder';
import {
  BuilderFactory,
  EntityProvider,
  PipelineResult,
} from './types';

class CatalogBuilder extends BuilderBase {
  private readonly entityProvider?: EntityProvider;
  private readonly locationTemplate: string;

  public constructor(options: {
    entityProvider?: EntityProvider;
    locationTemplate: string;
  }) {
    super();
    const { entityProvider, locationTemplate } = options;
    this.entityProvider = entityProvider;
    this.locationTemplate = locationTemplate;
  }

  public async build(result: PipelineResult): Promise<PipelineResult | undefined> {
    result = {
      ...result,
      entity: this.entityProvider ? this.entityProvider(result) : result.entity,
    };
    const { doc, source, entity } = result;
    const entityInfo = {
      kind: entity.kind,
      namespace: entity.metadata.namespace ?? 'default',
      name: entity.metadata.name,
    };
    let location = this.locationTemplate;
    for (const [key, value] of Object.entries({
      ...entityInfo,
    })) {
      location = location.replace(`:${key}`, value);
    }
    const refs = entityRefsBuilder(entity);
    const resultWithIndexObject = {
      ...result,
      indexObject: {
        source,
        title: unescape(doc.title),
        text: unescape(doc.text ?? ''),
        location,
        path: doc.location,
        section: false,
        entity: {
          ...entityInfo,
          title: entity.metadata.title ?? undefined,
          type: entity.spec?.type?.toString() ?? undefined,
          lifecycle: entity.spec?.lifecycle as string ?? undefined,
          ...refs,
        },
      },
    };
    return {
      ...resultWithIndexObject,
      indexObject: {
        ...resultWithIndexObject.indexObject,
        topics: entity.metadata.tags ?? [],
      }
    };
  }

  public async finalize(): Promise<void> {
    return Promise.resolve();
  }
}

export class CatalogBuilderFactory implements BuilderFactory {
  public static fromConfig(config: Config, options?: {
    entityProvider?: EntityProvider;
  }) {
    const { entityProvider } = options ?? {};
    const baseUrl = config.getString('app.baseUrl');
    const locationTemplate = config.getOptionalString('algolia.backend.indexes.catalog.locationTemplate')
      ?? url.resolve(baseUrl, '/catalog/:namespace/:kind/:name');
    return new CatalogBuilderFactory({ entityProvider, locationTemplate });
  }

  private readonly entityProvider?: EntityProvider;
  private readonly locationTemplate: string;

  public constructor(options: {
    entityProvider?: EntityProvider;
    locationTemplate: string;
  }) {
    const { entityProvider, locationTemplate } = options;
    this.entityProvider = entityProvider;
    this.locationTemplate = locationTemplate;
  }

  public async newBuilder(): Promise<BuilderBase> {
    return new CatalogBuilder({
      entityProvider: this.entityProvider,
      locationTemplate: this.locationTemplate,
    });
  }
}
