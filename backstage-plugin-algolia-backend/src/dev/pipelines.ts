import { IndexObject } from 'backstage-plugin-algolia-common';
import { Readable, Writable, pipeline } from 'stream';
import { Indexer } from '../pipelines';
import { BuilderFactory, CollatorFactory } from '../pipelines/types';

export const testCollatingBuildingPipeline = async (options: {
  collatorFactory: CollatorFactory;
  builderFactories?: BuilderFactory[];
}) => {
  const { builderFactories, collatorFactory } = options;
  const collator = await collatorFactory.newCollator();
  const builders = await Promise.all((builderFactories ?? []).map(b => b.newBuilder()));
  const results: any[] = [];
  const collector = new Writable({
    objectMode: true,
    write(
      result: any,
      _e: any,
      done: () => void,
    ) {
      results.push(result);
      done();
    }
  })
  return new Promise<any[]>(resolve => {
    pipeline([collator, ...builders, collector], () => resolve(results));
  });
};

export const testIndexingPipeline = async (options: {
  objects: (IndexObject | undefined)[];
  indexer: Indexer;
}) => {
  const { objects, indexer } = options;
  const items = [...objects];
  const objectStream = new Readable({
    objectMode: true,
    read() {
      const item = items.shift();
      this.push(item ? item : null);
    },
  });
  await new Promise<void>((resolve, reject) => {
    pipeline(objectStream, indexer, (e) => {
      if (e) {
        reject(e);
      } else {
        resolve();
      }
    });
  });
};
