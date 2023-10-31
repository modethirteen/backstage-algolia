import { Readable } from 'stream';
import { CollatorFactory, IndexObject } from '../types';
import { testPipeline } from './util';
import { CollatedTechDocsResult } from '../TechDocsCollatorFactory';
import {
  entities as mockEntities,
  search as mockSearchDocIndex,
  objects as mockObjects,
} from './mocks.json';
import { TechDocsBuilderFactory } from '../TechDocsBuilderFactory';
import { ConfigReader } from '@backstage/config';

class TestCollatorFactory implements CollatorFactory {
  private results: CollatedTechDocsResult[];

  constructor(options: { results: CollatedTechDocsResult[] }) {
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
      .map(entity => mockSearchDocIndex.docs.map(doc => ({ entity, doc })))
      .flat() as CollatedTechDocsResult[];
    const collatorFactory = new TestCollatorFactory({ results });
    const builderFactories = [TechDocsBuilderFactory.fromConfig(config)];
    const objects = await testPipeline({ collatorFactory, builderFactories }) as IndexObject[];
    expect(objects).toHaveLength(18);
    expect(objects).toEqual(expect.arrayContaining(mockObjects));
  });
});
