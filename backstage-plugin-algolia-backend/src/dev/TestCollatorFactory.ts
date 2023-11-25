import { Readable } from 'stream';
import { CollatorFactory, CollatorResult } from '../pipelines';

export class TestCollatorFactory implements CollatorFactory {
  private results: CollatorResult[];

  constructor(options: { results: CollatorResult[] }) {
    const { results } = options;
    this.results = results;
  }

  newCollator(): Promise<Readable> {
    return Promise.resolve(Readable.from(this.results));
  }
}
