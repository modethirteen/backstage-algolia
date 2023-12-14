import { Config } from '@backstage/config';
import { assertError } from '@backstage/errors';
import { unescape } from 'lodash';
import * as url from 'url';
import { BuilderBase } from './BuilderBase';
import { TopicProviderInterface } from './TopicProviderInterface';
import { entityRefsBuilder } from './entityRefsBuilder';
import {
  BuilderFactory,
  EntityProvider,
  PipelineResult,
} from './types';

class TechDocsBuilder extends BuilderBase {
  private readonly entityProvider?: EntityProvider;
  private readonly locationTemplate: string;
  private readonly topicProvider?: TopicProviderInterface;

  public constructor(options: {
    entityProvider?: EntityProvider;
    locationTemplate: string;
    topicProvider?: TopicProviderInterface;
  }) {
    super();
    const { entityProvider, locationTemplate, topicProvider } = options;
    this.entityProvider = entityProvider;
    this.locationTemplate = locationTemplate;
    this.topicProvider = topicProvider;
  }

  public async build(result: PipelineResult): Promise<PipelineResult | undefined> {
    result = {
      ...result,
      entity: this.entityProvider ? await this.entityProvider(result) : result.entity,
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
      path: doc.location,
    })) {
      location = location.replace(`:${key}`, value);
    }
    const refs = entityRefsBuilder(entity);
    let section = false;
    try {
      section = new url.URL(location).hash !== '';
    } catch(e) {
      assertError(e);
      throw new Error(`Could not parse location URL to determine if location is a page section: ${e.message}`);
    }
    const resultWithIndexObject = {
      ...result,
      indexObject: {
        source,
        title: unescape(doc.title),
        text: unescape(doc.text ?? ''),
        location,
        path: doc.location,
        section,
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
        topics: this.topicProvider ? await this.topicProvider.getTopics({ result: resultWithIndexObject }) : [],
      }
    };
  }

  public async finalize(): Promise<void> {
    return Promise.resolve();
  }
}

export class TechDocsBuilderFactory implements BuilderFactory {
  public static fromConfig(config: Config, options?: {
    entityProvider?: EntityProvider;
    topicProvider?: TopicProviderInterface;
  }) {
    const { entityProvider, topicProvider } = options ?? {};
    const baseUrl = config.getString('app.baseUrl');
    const locationTemplate = config.getOptionalString('algolia.backend.indexes.techdocs.locationTemplate')
      ?? url.resolve(baseUrl, '/docs/:namespace/:kind/:name/:path');
    return new TechDocsBuilderFactory({ entityProvider, locationTemplate, topicProvider });
  }

  private readonly entityProvider?: EntityProvider;
  private readonly locationTemplate: string;
  private readonly topicProvider?: TopicProviderInterface;

  public constructor(options: {
    entityProvider?: EntityProvider;
    locationTemplate: string;
    topicProvider?: TopicProviderInterface;
  }) {
    const { entityProvider, locationTemplate, topicProvider } = options;
    this.entityProvider = entityProvider;
    this.locationTemplate = locationTemplate;
    this.topicProvider = topicProvider;
  }

  public async newBuilder(): Promise<BuilderBase> {
    return new TechDocsBuilder({
      entityProvider: this.entityProvider,
      locationTemplate: this.locationTemplate,
      topicProvider: this.topicProvider,
    });
  }
}
