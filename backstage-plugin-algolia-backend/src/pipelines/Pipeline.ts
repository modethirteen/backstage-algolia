import { pipeline } from 'stream';
import { Indexer } from './Indexer';
import { BuilderFactory, CollatorFactory } from './types';

export interface PipelineOptions {
  builderFactories: BuilderFactory[];
  collatorFactory: CollatorFactory;
  indexer: Indexer;
}

export class Pipeline {
  private readonly builderFactories: BuilderFactory[];
  private readonly collatorFactory: CollatorFactory;
  private readonly indexer: Indexer;

  public constructor(options: PipelineOptions) {
    const { builderFactories, collatorFactory, indexer } = options;
    this.builderFactories = builderFactories;
    this.collatorFactory = collatorFactory;
    this.indexer = indexer;
  }

  public async execute() {
    const builders = await Promise.all(this.builderFactories.map(b => b.newBuilder()));
    const collator = await this.collatorFactory.newCollator();
    return new Promise<void>((resolve, reject) => {
      try {
        pipeline(
          [collator, ...builders, this.indexer], (error: NodeJS.ErrnoException | null) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          },
        );
      } catch(e) {
        reject(e);
      }
    });
  }
}
