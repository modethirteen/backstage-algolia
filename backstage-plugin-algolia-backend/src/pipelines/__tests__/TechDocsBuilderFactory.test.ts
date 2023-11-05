import { Readable } from 'stream';
import {
  CollatorFactory,
  CollatorResult,
  IndexObject,
} from '../types';
import { testPipeline } from './util';
import {
  entities as mockEntities,
  search as mockSearchDocIndex,
  objects as mockObjects,
} from './mocks.json';
import { TechDocsBuilderFactory } from '../TechDocsBuilderFactory';
import { ConfigReader } from '@backstage/config';

class TestCollatorFactory implements CollatorFactory {
  private results: CollatorResult[];

  constructor(options: { results: CollatorResult[] }) {
    const { results } = options;
    this.results = results;
  }

  newCollator(): Promise<Readable> {
    return Promise.resolve(Readable.from(this.results));
  }
}

describe('TechDocsBuilderFactory', () => {
  const config = new ConfigReader({
    app: {
      baseUrl: 'https://dev.example.com',
    },
  });

  it('can build an index object from entity and mkdocs search index items', async () => {
    const results = mockEntities
      .filter(entity => entity.metadata.annotations?.['backstage.io/techdocs-ref'])
      .map(entity => mockSearchDocIndex.docs.map(doc => ({ entity, doc, source: 'mkdocs' })))
      .flat() as CollatorResult[];
    const collatorFactory = new TestCollatorFactory({ results });
    const builderFactories = [TechDocsBuilderFactory.fromConfig(config)];
    const objects = await testPipeline({ collatorFactory, builderFactories }) as IndexObject[];
    expect(objects).toHaveLength(18);
    expect(objects).toEqual(expect.arrayContaining(mockObjects));
  });
});
