import { ConfigReader } from '@backstage/config';
import { IndexObject } from 'backstage-plugin-algolia-common';
import { TestCollatorFactory, testCollatingBuildingPipeline } from '../../dev';
import { TechDocsBuilderFactory } from '../TechDocsBuilderFactory';
import {
  collatorResults as mockCollatorResults,
  indexObjects as mockObjects,
} from './mocks.json';

const config = new ConfigReader({
  app: {
    baseUrl: 'https://dev.example.com',
  },
});

describe('TechDocsBuilderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can build an index object from entity and mkdocs search index items', async () => {
    const collatorFactory = new TestCollatorFactory({ results: mockCollatorResults });
    const builderFactories = [TechDocsBuilderFactory.fromConfig(config)];
    const objects = await testCollatingBuildingPipeline({ collatorFactory, builderFactories }) as IndexObject[];
    expect(objects).toHaveLength(24);
    expect(objects).toEqual(expect.arrayContaining(mockObjects));
  });
});
