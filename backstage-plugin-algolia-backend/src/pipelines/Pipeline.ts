import { Logger } from 'winston';
import { Indexer } from './Indexer';
import { BuilderFactory, CollatorFactory } from './types';
import { pipeline } from 'stream';

export interface PipelineOptions {
  builderFactories: BuilderFactory[];
  collatorFactory: CollatorFactory;
  indexer: Indexer;
  logger: Logger;
}

export class Pipeline {
  private readonly builderFactories: BuilderFactory[];
  private readonly collatorFactory: CollatorFactory;
  private readonly indexer: Indexer;
  private readonly logger: Logger;

  constructor(options: PipelineOptions) {
    const { builderFactories, collatorFactory, indexer, logger } = options;
    this.builderFactories = builderFactories;
    this.collatorFactory = collatorFactory;
    this.indexer = indexer;
    this.logger = logger;
  }

  public async execute() {
    const builders = await Promise.all(this.builderFactories.map(b => b.newBuilder()));
    const collator = await this.collatorFactory.newCollator();
    return new Promise<void>((resolve, reject) => {
      pipeline(
        [collator, ...builders, this.indexer], (error: NodeJS.ErrnoException | null) => {
          if (error) {
            this.logger.error(`Collating, building, and indexing documents for Algolia failed: ${error.message}`, error);
            reject(error);
          } else {
            this.logger.info(`Collating, building, and indexing documents for Algolia succeeded`);
            resolve();
          }
        },
      );
    });
  }
}
