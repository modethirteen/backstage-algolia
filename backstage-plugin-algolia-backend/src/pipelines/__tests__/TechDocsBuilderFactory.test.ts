import { ConfigReader } from '@backstage/config';
import { IndexObject } from 'backstage-plugin-algolia-common';
import { TestCollatorFactory, testCollatingBuildingPipeline } from '../../dev';
import { TechDocsBuilderFactory } from '../TechDocsBuilderFactory';
import {
  CollatorResult
} from '../types';
import {
  entities as mockEntities,
  objects as mockObjects,
  search as mockSearchDocIndex,
} from './mocks.json';

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
    const objects = await testCollatingBuildingPipeline({ collatorFactory, builderFactories }) as IndexObject[];
    expect(objects).toHaveLength(18);
    expect(objects).toEqual(expect.arrayContaining(mockObjects));
  });
});
