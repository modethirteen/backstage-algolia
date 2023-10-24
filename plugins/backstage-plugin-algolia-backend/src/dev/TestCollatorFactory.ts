import { Readable } from 'stream';
import { CollatorFactory, PipelineResult } from '../pipelines';

export class TestCollatorFactory implements CollatorFactory {
  private results: PipelineResult[];

  public constructor(options: { results: PipelineResult[] }) {
    const { results } = options;
    this.results = results;
  }

  public newCollator(): Promise<Readable> {
    return Promise.resolve(Readable.from(this.results));
  }
}
