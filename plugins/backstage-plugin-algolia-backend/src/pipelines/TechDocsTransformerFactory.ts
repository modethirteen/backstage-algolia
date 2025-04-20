import { parseEntityRef } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import * as url from 'url';
import { TransformerBase } from './TransformerBase';
import {
  TransformerFactory,
  EntityProvider,
  EntityProviderFactoryInterface,
  PipelineResult,
} from './types';

class TechDocsTransformer extends TransformerBase {
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

  public async transform(
    result: PipelineResult,
  ): Promise<PipelineResult | undefined> {
    result = {
      ...result,
      entity: this.entityProvider
        ? await this.entityProvider(result)
        : result.entity,
    };
    const { indexObject, entity } = result;
    const techdocsEntityRef =
      entity.metadata.annotations?.['backstage.io/techdocs-entity'];
    const techdocsEntityInfo = techdocsEntityRef
      ? parseEntityRef(techdocsEntityRef)
      : {
          kind: entity.kind,
          namespace: entity.metadata.namespace ?? 'default',
          name: entity.metadata.name,
        };
    let location = this.locationTemplate;
    for (const [key, value] of Object.entries({
      ...techdocsEntityInfo,
      path: indexObject.location,
    })) {
      location = location.replace(`:${key}`, value);
    }
    return {
      ...result,
      indexObject: {
        ...indexObject,
        location,
      },
    };
  }

  public async finalize(): Promise<void> {
    return Promise.resolve();
  }
}

export class TechDocsTransformerFactory implements TransformerFactory {
  public static fromConfig(
    config: Config,
    options?: {
      entityProviderFactory?: EntityProviderFactoryInterface;
    },
  ) {
    const { entityProviderFactory } = options ?? {};
    const baseUrl = config.getString('app.baseUrl');
    const locationTemplate =
      config.getOptionalString(
        'algolia.backend.indexes.techdocs.locationTemplate',
      ) ?? url.resolve(baseUrl, '/docs/:namespace/:kind/:name/:path');
    return new TechDocsTransformerFactory({
      entityProviderFactory,
      locationTemplate,
    });
  }

  private readonly entityProviderFactory?: EntityProviderFactoryInterface;
  private readonly locationTemplate: string;

  public constructor(options: {
    entityProviderFactory?: EntityProviderFactoryInterface;
    locationTemplate: string;
  }) {
    const { entityProviderFactory, locationTemplate } = options;
    this.entityProviderFactory = entityProviderFactory;
    this.locationTemplate = locationTemplate;
  }

  public async newTransformer(): Promise<TransformerBase> {
    return new TechDocsTransformer({
      entityProvider: await this.entityProviderFactory?.newEntityProvider(),
      locationTemplate: this.locationTemplate,
    });
  }
}
