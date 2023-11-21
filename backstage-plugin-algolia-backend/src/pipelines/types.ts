import { Entity } from '@backstage/catalog-model';
import { Readable } from 'stream';
import { BuilderBase } from './BuilderBase';

export interface BuilderFactory {
  newBuilder(): Promise<BuilderBase>;
}

export interface CollatorFactory {
  newCollator(): Promise<Readable>;
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
