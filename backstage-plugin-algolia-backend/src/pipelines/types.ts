import { CompoundEntityRef, Entity } from '@backstage/catalog-model';
import { Readable } from 'stream';
import { BuilderBase } from './BuilderBase';

export interface BuilderFactory {
  newBuilder(): Promise<BuilderBase>;
}

export interface CollatorFactory {
  newCollator(): Promise<Readable>;
}

export interface IndexObject {
  source: string;
  title: string;
  text: string;
  location: string;
  path: string;
  section: boolean;
  summary?: string;
  entity?: {
    kind: string;
    namespace: string;
    name: string;
    title?: string;
    type?: string;
    lifecycle?: string;
    owner?: string;
    ownerRef?: CompoundEntityRef;
    parent?: string;
    parentRef?: CompoundEntityRef;
    domain?: string;
    domainRef?: CompoundEntityRef;
    system?: string;
    systemRef?: CompoundEntityRef;
  };
}

export interface IndexObjectWithIdAndTimestamp extends IndexObject {
  objectID: string;
  timestamp: string;
}

export interface CollatorResult {
  entity: Entity;
  doc: IndexableDocument;
  source: string;
}

export interface IndexableDocument {
  title: string;
  text: string;
  location: string;
}
