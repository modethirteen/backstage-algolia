import { ConfigReader } from '@backstage/config';
import { PipelineResult } from './types';
import {
  TestCollatorFactory,
  testCollatingTransformingPipeline,
} from '../test/utils';
import { CatalogTransformerFactory } from './CatalogTransformerFactory';
import { catalogPipelineResults as mockPipelineResults } from '../test/mocks.json';

describe('CatalogTransformerFactory', () => {
  const config = new ConfigReader({
    app: {
      baseUrl: 'https://dev.example.com',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("can transform an index object's location", async () => {
    const collatorFactory = new TestCollatorFactory({
      results: mockPipelineResults as PipelineResult[],
    });
    const transformerFactories = [CatalogTransformerFactory.fromConfig(config)];
    const results = await testCollatingTransformingPipeline({
      collatorFactory,
      transformerFactories,
    });
    expect(results).toHaveLength(13);
    expect(results).toEqual(
      expect.arrayContaining(
        mockPipelineResults.map(r => ({
          ...r,
          indexObject: {
            ...r.indexObject,
            location: `https://dev.example.com/catalog/default/${r.entity.kind}/${r.entity.metadata.name}`,
          },
        })),
      ),
    );
  });

  it('can override entity', async () => {
    const collatorFactory = new TestCollatorFactory({
      results: mockPipelineResults as PipelineResult[],
    });
    const transformerFactories = [
      CatalogTransformerFactory.fromConfig(config, {
        entityProviderFactory: {
          newEntityProvider: jest.fn().mockResolvedValue((r: PipelineResult) =>
            Promise.resolve({
              ...r.entity,
              metadata: {
                ...r.entity.metadata,
                name: 'replaced',
              },
            }),
          ),
        },
      }),
    ];
    const results = await testCollatingTransformingPipeline({
      collatorFactory,
      transformerFactories,
    });
    results.map(r => expect(r.entity.metadata.name).toEqual('replaced'));
  });
});
