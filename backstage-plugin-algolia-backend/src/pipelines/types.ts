import { Entity } from '@backstage/catalog-model';
import { IndexObject } from 'backstage-plugin-algolia-common';
import { Readable } from 'stream';
import { BuilderBase } from './BuilderBase';

export interface BuilderFactory {
  newBuilder(): Promise<BuilderBase>;
}

export interface CollatorFactory {
  newCollator(): Promise<Readable>;
}

export interface PipelineResult {
  entity: Entity;
  doc: IndexableDocument;
  docs?: IndexableDocument[];
  source: string;
  indexObject?: IndexObject;
}

export interface IndexableDocument {
  title: string;
  text: string;
  location: string;
}
