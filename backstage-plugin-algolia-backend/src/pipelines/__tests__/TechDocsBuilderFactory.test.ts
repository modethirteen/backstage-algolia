import { ConfigReader } from '@backstage/config';
import { IndexObject } from 'backstage-plugin-algolia-common';
import { Readable } from 'stream';
import { TechDocsBuilderFactory } from '../TechDocsBuilderFactory';
import {
  CollatorFactory,
  CollatorResult,
} from '../types';
import {
  entities as mockEntities,
  objects as mockObjects,
  search as mockSearchDocIndex,
} from './mocks.json';
import { testPipeline } from './util';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });
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
