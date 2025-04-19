import { pipeline } from 'stream';
import { Indexer } from './Indexer';
import { TransformerFactory, CollatorFactory } from './types';

export interface PipelineOptions {
  transformerFactories: TransformerFactory[];
  collatorFactory: CollatorFactory;
  indexer: Indexer;
}

export class Pipeline {
  private readonly transformerFactories: TransformerFactory[];
  private readonly collatorFactory: CollatorFactory;
  private readonly indexer: Indexer;

  public constructor(options: PipelineOptions) {
    const { transformerFactories, collatorFactory, indexer } = options;
    this.transformerFactories = transformerFactories;
    this.collatorFactory = collatorFactory;
    this.indexer = indexer;
  }

  public async execute() {
    const transformers = await Promise.all(this.transformerFactories.map(b => b.newTransformer()));
    const collator = await this.collatorFactory.newCollator();
    return new Promise<void>((resolve, reject) => {
      try {
        pipeline(
          [collator, ...transformers, this.indexer], (error: NodeJS.ErrnoException | null) => {
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
