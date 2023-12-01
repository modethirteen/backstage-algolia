import { Readable } from 'stream';
import { CollatorFactory, PipelineResult } from '../pipelines';

export class TestCollatorFactory implements CollatorFactory {
  private results: PipelineResult[];

  constructor(options: { results: PipelineResult[] }) {
    const { results } = options;
    this.results = results;
  }

  newCollator(): Promise<Readable> {
    return Promise.resolve(Readable.from(this.results));
  }
}
