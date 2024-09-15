import { ConfigReader } from '@backstage/config';
import { PipelineResult, TechDocsTransformerFactory } from '../';
import { TestCollatorFactory, testCollatingTransformingPipeline } from '../../dev';
import { techdocsPipelineResults as mockPipelineResults } from './mocks.json';

const config = new ConfigReader({
  app: {
    baseUrl: 'https://dev.example.com',
  },
});

describe('TechDocsTransformerFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can transform an index object\'s location', async () => {
    const collatorFactory = new TestCollatorFactory({ results: mockPipelineResults as PipelineResult[] });
    const transformerFactories = [TechDocsTransformerFactory.fromConfig(config)];
    const results = await testCollatingTransformingPipeline({ collatorFactory, transformerFactories });
    expect(results).toHaveLength(24);
    expect(results).toEqual(expect.arrayContaining(
      mockPipelineResults.map(r => ({
        ...r,
        indexObject: {
          ...r.indexObject,
          location: `https://dev.example.com/docs/default/${r.entity.kind}/${r.entity.metadata.name}/${r.indexObject.location}`,
        },
      }))
    ));
  });

  it('can override entity', async () => {
    const collatorFactory = new TestCollatorFactory({ results: mockPipelineResults as PipelineResult[] });
    const transformerFactories = [TechDocsTransformerFactory.fromConfig(config, {
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
    const results = await testCollatingTransformingPipeline({ collatorFactory, transformerFactories });
    results.map(r => expect(r.entity.metadata.name).toEqual('replaced'));
  });

  it('can use techdocs-entity annotation for index object location', async () => {
    const collatorFactory = new TestCollatorFactory({
      results: mockPipelineResults.map(({ entity, indexObject }) => ({
        entity: {
          ...entity,
          metadata: {
            ...entity.metadata,
            annotations: {
              ...entity.metadata.annotations,
              'backstage.io/techdocs-entity': 'component:default/crystal',
            },
          },
        },
        indexObject,
      }))
    });
    const transformerFactories = [TechDocsTransformerFactory.fromConfig(config)];
    const results = await testCollatingTransformingPipeline({ collatorFactory, transformerFactories });
    results.map(r => {
      expect(r.indexObject?.location.startsWith('https://dev.example.com/docs/default/component/crystal/')).toBeTruthy();
      expect(r.entity.metadata.name).not.toEqual('crystal');
    });
  });
});
