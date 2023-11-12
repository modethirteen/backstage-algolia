import {
  RELATION_OWNED_BY,
  RELATION_PART_OF,
  parseEntityRef,
} from '@backstage/catalog-model';
import {
  BuilderFactory,
  CollatorResult,
  IndexObject,
} from './types';
import * as url from 'url';
import { unescape } from 'lodash';
import { compare } from '../util';
import { Config } from '@backstage/config';
import { BuilderBase } from './BuilderBase';

class TechDocsBuilder extends BuilderBase {
  private readonly locationTemplate: string;

  public constructor(options: { locationTemplate: string; }) {
    super({ objectMode: true });
    const { locationTemplate } = options;
    this.locationTemplate = locationTemplate;
  }

  public async build(item: any): Promise<IndexObject | undefined> {
    const { entity, doc, source } = item as CollatorResult;
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
    return {
      source,
      title: unescape(doc.title),
      text: unescape(doc.text ?? ''),
      location,
      path: doc.location,
      entity: {
        ...entityInfo,
        title: entity.metadata.title ?? undefined,
        type: entity.spec?.type?.toString() ?? undefined,
        lifecycle: entity.spec?.lifecycle as string ?? undefined,
        ...refs,
      },
    };
  }

  public async finalize(): Promise<void> {
    return Promise.resolve();
  }
}

export class TechDocsBuilderFactory implements BuilderFactory {
  public static fromConfig(config: Config) {
    const baseUrl = config.getString('app.baseUrl');
    const locationTemplate = config.getOptionalString('algolia.indexes.techdocs.locationTemplate')
      ?? url.resolve(baseUrl, '/docs/:namespace/:kind/:name/:path');
    return new TechDocsBuilderFactory({ locationTemplate });
  }

  private readonly locationTemplate: string;

  public constructor(options: { locationTemplate: string; }) {
    const { locationTemplate } = options;
    this.locationTemplate = locationTemplate;
  }

  public async newBuilder(): Promise<BuilderBase> {
    return new TechDocsBuilder({ locationTemplate: this.locationTemplate });
  }
}

