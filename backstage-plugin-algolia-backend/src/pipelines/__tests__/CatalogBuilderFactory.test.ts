import { ConfigReader } from '@backstage/config';
import { PipelineResult } from '../';
import { TestCollatorFactory, testCollatingBuildingPipeline } from '../../dev';
import { CatalogBuilderFactory } from '../CatalogBuilderFactory';
import { catalogPipelineResults as mockPipelineResults } from './mocks.json';

const config = new ConfigReader({
  app: {
    baseUrl: 'https://dev.example.com',
  },
});

describe('CatalogBuilderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can build an index object from entities', async () => {
    const collatorFactory = new TestCollatorFactory({
      results: mockPipelineResults.map(({ entity, doc, source }) => ({ entity, doc, source } as PipelineResult))
    });
    const builderFactories = [CatalogBuilderFactory.fromConfig(config)];
    const results = await testCollatingBuildingPipeline({ collatorFactory, builderFactories });
    expect(results).toHaveLength(13);
    expect(results).toEqual(expect.arrayContaining(mockPipelineResults));
  });

  it('can override entity', async () => {
    const collatorFactory = new TestCollatorFactory({
      results: mockPipelineResults.map(({ entity, doc, source }) => ({ entity, doc, source } as PipelineResult))
    });
    const builderFactories = [CatalogBuilderFactory.fromConfig(config, {
      entityProviderFactory: {
        newEntityProvider: jest.fn().mockResolvedValue(
          (r: PipelineResult) => Promise.resolve({
            ...r.entity,
            metadata: {
              ...r.entity.metadata,
              name: 'replaced',
            },
          }),
        ),
      },
    })];
    const results = await testCollatingBuildingPipeline({ collatorFactory, builderFactories });
    results.map(r => expect(r.entity.metadata.name).toEqual('replaced'));
  });
});
