import { ConfigReader } from '@backstage/config';
import { TestCollatorFactory, testCollatingBuildingPipeline } from '../../dev';
import { TechDocsBuilderFactory } from '../TechDocsBuilderFactory';
import { pipelineResults as mockPipelineResults } from './mocks.json';

const config = new ConfigReader({
  app: {
    baseUrl: 'https://dev.example.com',
  },
});

const getTopics = jest.fn();

describe('TechDocsBuilderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can build an index object from entity and mkdocs search index items', async () => {
    const collatorFactory = new TestCollatorFactory({
      results: mockPipelineResults.map(({ entity, doc, docs, source }) => ({
        entity, doc, docs, source   
      }))
    });
    getTopics.mockResolvedValue(['api', 'system', 'debug']);
    const builderFactories = [TechDocsBuilderFactory.fromConfig(config, { getTopics })];
    const results = await testCollatingBuildingPipeline({ collatorFactory, builderFactories });
    expect(results).toHaveLength(24);
    expect(results).toEqual(expect.arrayContaining(mockPipelineResults));
  });
});
