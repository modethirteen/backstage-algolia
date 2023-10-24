import { registerMswTestHooks } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CatalogCollatorFactory } from '..';
import { testCollatingTransformingPipeline } from '../dev';
import { compare } from '../util';
import {
  entities as mockEntities,
  catalogPipelineResults as mockPipelineResults,
} from './mocks.json';
import { mockServices } from '@backstage/backend-test-utils';

const auth = mockServices.auth.mock();
auth.getPluginRequestToken.mockResolvedValue({ token: 'bar' });
const discovery = mockServices.discovery.mock();
discovery.getBaseUrl.mockResolvedValue('http://backend.example.com');
const deps = {
  auth,
  discovery,
  logger: mockServices.logger.mock(),
};

describe('CatalogCollatorFactory', () => {
  const worker = setupServer();
  registerMswTestHooks(worker);
  beforeEach(async () => {
    jest.clearAllMocks();
    worker.use(
      rest.get('http://backend.example.com/entities', (req, res, ctx) => {
        const filter = req.url.searchParams.get('filter');
        const kinds = filter
          ? filter
              .match(/kind=([^,]+)/g)
              ?.map(m => m.split('=')[1].toLocaleLowerCase('en-US')) ?? []
          : [];
        const entities = kinds.length
          ? mockEntities.filter(m =>
              kinds.includes(m.kind.toLocaleLowerCase('en-US')),
            )
          : mockEntities;
        const offset = parseInt(req.url.searchParams.get('offset') || '0', 10);
        const limit = parseInt(req.url.searchParams.get('limit') || '500', 10);
        if (limit === 50) {
          if (offset === 0) {
            return res(ctx.status(200), ctx.json(Array(50).fill({})));
          }
          return res(ctx.status(200), ctx.json(entities));
        }
        return res(
          ctx.status(200),
          ctx.json(entities.slice(offset, limit + offset)),
        );
      }),
    );
  });

  it('fetches from the configured catalog service', async () => {
    const factory = CatalogCollatorFactory.fromConfig(
      new ConfigReader({}),
      deps,
    );
    const results = await testCollatingTransformingPipeline({
      collatorFactory: factory,
    });
    expect(discovery.getBaseUrl).toHaveBeenCalledWith('catalog');
    expect(results).toHaveLength(13);
    expect(results).toEqual(expect.arrayContaining(mockPipelineResults));
  });

  it('fetches configured kinds from the configured catalog service', async () => {
    const factory = CatalogCollatorFactory.fromConfig(
      new ConfigReader({
        algolia: {
          backend: {
            indexes: {
              catalog: {
                kinds: ['system'],
              },
            },
          },
        },
      }),
      deps,
    );
    const results = await testCollatingTransformingPipeline({
      collatorFactory: factory,
    });
    expect(discovery.getBaseUrl).toHaveBeenCalledWith('catalog');
    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining(
        mockPipelineResults.filter(({ entity }) =>
          compare(entity.kind, 'system'),
        ),
      ),
    );
  });
});
