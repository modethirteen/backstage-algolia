import { ConfigReader } from '@backstage/config';
import { TechDocsBuilderFactory } from '../';
import { TestCollatorFactory, testCollatingBuildingPipeline } from '../../dev';
import { techdocsPipelineResults as mockPipelineResults } from './mocks.json';

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
    const builderFactories = [TechDocsBuilderFactory.fromConfig(config, { topicProvider: { getTopics } })];
    const results = await testCollatingBuildingPipeline({ collatorFactory, builderFactories });
    expect(results).toHaveLength(24);
    expect(results).toEqual(expect.arrayContaining(mockPipelineResults));
  });

  it('can provide pipeline result with index object to topic provider', async () => {
    const collatorFactory = new TestCollatorFactory({
      results: mockPipelineResults.map(({ entity, doc, docs, source }) => ({
        entity, doc, docs, source   
      }))
    });
    const builderFactories = [TechDocsBuilderFactory.fromConfig(config, { topicProvider: {  getTopics } })];
    await testCollatingBuildingPipeline({ collatorFactory, builderFactories });
    const calls = getTopics.mock.calls.map((c: any[]) => c.at(0));
    calls.map(c => expect(c.result.indexObject).toBeDefined());
  });

  it('can override entity', async () => {
    const collatorFactory = new TestCollatorFactory({
      results: mockPipelineResults.map(({ entity, doc, docs, source }) => ({
        entity, doc, docs, source   
      }))
    });
    const builderFactories = [TechDocsBuilderFactory.fromConfig(config, {
      entityProvider: r => Promise.resolve({
        ...r.entity,
        metadata: {
          ...r.entity.metadata,
          name: 'replaced',
        },
      }),
    })];
    const results = await testCollatingBuildingPipeline({ collatorFactory, builderFactories });
    results.map(r => expect(r.entity.metadata.name).toEqual('replaced'));
  });
});
