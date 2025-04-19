import { Entity } from '@backstage/catalog-model';
import { IndexObject } from 'backstage-plugin-algolia-common';
import { Readable } from 'stream';
import { TransformerBase } from './TransformerBase';

export interface TransformerFactory {
  newTransformer(): Promise<TransformerBase>;
}

export interface CollatorFactory {
  newCollator(): Promise<Readable>;
}

export interface PipelineResult {
  entity: Entity;
  indexObject: IndexObject;
  data?: object;
}

export type EntityProvider = (result: PipelineResult) => Promise<Entity>;

export interface EntityProviderFactoryInterface {
  newEntityProvider(): Promise<EntityProvider>;
}
