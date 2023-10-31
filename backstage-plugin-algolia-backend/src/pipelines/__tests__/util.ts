import { BuilderFactory, CollatorFactory } from '../types';
import { pipeline, Writable } from 'stream';

class TestResultCollector extends Writable {
  public results: any[] = [];

  constructor() {
    super({ objectMode: true });
  }

  _write(
    result: any,
    _e: any,
    done: () => void,
  ) {
    this.results.push(result);
    done();
  }
}

export const testPipeline = async (options: {
  collatorFactory: CollatorFactory;
  builderFactories?: BuilderFactory[];
}) => {
  const { builderFactories, collatorFactory } = options;
  const collator = await collatorFactory.newCollator();
  const builders = await Promise.all((builderFactories ?? []).map(b => b.newBuilder()));
  const collector = new TestResultCollector();
  return new Promise<any[]>(resolve => {
    pipeline([collator, ...builders, collector], () => resolve(collector.results));
  });
};