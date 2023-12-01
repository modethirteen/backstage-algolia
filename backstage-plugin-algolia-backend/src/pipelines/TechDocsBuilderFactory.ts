import {
  RELATION_OWNED_BY,
  RELATION_PART_OF,
  parseEntityRef,
} from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { assertError } from '@backstage/errors';
import { unescape } from 'lodash';
import * as url from 'url';
import { compare } from '../util';
import { BuilderBase } from './BuilderBase';
import { TopicProviderInterface } from './TopicProviderInterface';
import {
  BuilderFactory,
  PipelineResult,
} from './types';

class TechDocsBuilder extends BuilderBase {
  private readonly locationTemplate: string;
  private readonly topicProvider: TopicProviderInterface;

  public constructor(options: {
    locationTemplate: string;
    topicProvider: TopicProviderInterface;
  }) {
    super();
    const { locationTemplate, topicProvider } = options;
    this.locationTemplate = locationTemplate;
    this.topicProvider = topicProvider;
  }

  public async build(result: PipelineResult): Promise<PipelineResult | undefined> {
    const { entity, doc, source } = result;
    const entityInfo = {
      kind: entity.kind,
      namespace: entity.metadata.namespace || 'default',
      name: entity.metadata.name,
    };
    let location = this.locationTemplate;
    for (const [key, value] of Object.entries({
      ...entityInfo,
      path: doc.location,
    })) {
      location = location.replace(`:${key}`, value);
    }
    let refs = {};
    const ownerTargetRef = entity.relations
      ?.find(r => r.type === RELATION_OWNED_BY)
      ?.targetRef;
    if (ownerTargetRef) {
      const parsedOwnerRef = parseEntityRef(ownerTargetRef);
      refs = {
        ...refs,
        owner: parsedOwnerRef.name,
        ownerRef: parsedOwnerRef,
      };
    }
    const domainTargetRef = entity.relations
      ?.find(r => r.type === RELATION_PART_OF && compare(parseEntityRef(r.targetRef).kind, 'domain'))
      ?.targetRef;
    if (domainTargetRef) {
      const parsedDomainRef = parseEntityRef(domainTargetRef);
      refs = {
        ...refs,
        domain: parsedDomainRef.name,
        domainRef: parsedDomainRef,
      };
    }
    const systemTargetRef = entity.relations
      ?.find(r => r.type === RELATION_PART_OF && compare(parseEntityRef(r.targetRef).kind, 'system'))
      ?.targetRef;
    if (systemTargetRef) {
      const parsedSystemRef = parseEntityRef(systemTargetRef);
      refs = {
        ...refs,
        system: parsedSystemRef.name,
        systemRef: parsedSystemRef,
      };
    }
    let section = false;
    try {
      section = new url.URL(location).hash !== '';
    } catch(e) {
      assertError(e);
      throw new Error(`Could not parse location URL to determine if location is a page section: ${e.message}`);
    }
    return {
      ...result,
      indexObject: {
        source,
        title: unescape(doc.title),
        text: unescape(doc.text ?? ''),
        location,
        path: doc.location,
        section,
        topics: await this.topicProvider.getTopics({ result }),
        entity: {
          ...entityInfo,
          title: entity.metadata.title ?? undefined,
          type: entity.spec?.type?.toString() ?? undefined,
          lifecycle: entity.spec?.lifecycle as string ?? undefined,
          ...refs,
        },
      },
    };
  }

  public async finalize(): Promise<void> {
    return Promise.resolve();
  }
}

export class TechDocsBuilderFactory implements BuilderFactory {
  public static fromConfig(config: Config, topicProvider: TopicProviderInterface) {
    const baseUrl = config.getString('app.baseUrl');
    const locationTemplate = config.getOptionalString('algolia.backend.indexes.techdocs.locationTemplate')
      ?? url.resolve(baseUrl, '/docs/:namespace/:kind/:name/:path');
    return new TechDocsBuilderFactory({ locationTemplate, topicProvider });
  }

  private readonly locationTemplate: string;
  private readonly topicProvider: TopicProviderInterface;

  public constructor(options: {
    locationTemplate: string;
    topicProvider: TopicProviderInterface;
  }) {
    const { locationTemplate, topicProvider } = options;
    this.locationTemplate = locationTemplate;
    this.topicProvider = topicProvider;
  }

  public async newBuilder(): Promise<BuilderBase> {
    return new TechDocsBuilder({
      locationTemplate: this.locationTemplate,
      topicProvider: this.topicProvider,
    });
  }
}

