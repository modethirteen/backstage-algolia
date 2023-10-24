import { registerMswTestHooks } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import {
  entities as mockEntities,
  techdocsPipelineResults as mockPipelineResults,
  searchDocIndex as mockSearchDocIndex,
} from '../test/mocks.json';
import { mockServices } from '@backstage/backend-test-utils';
import { TechDocsCollatorFactory } from './TechDocsCollatorFactory';
import { testCollatingTransformingPipeline } from '../test/utils';

describe('TechDocsCollatorFactory', () => {
  const worker = setupServer();
  registerMswTestHooks(worker);
  let factory: TechDocsCollatorFactory;
  const discovery = mockServices.discovery.mock();

  beforeEach(async () => {
    jest.clearAllMocks();
    const auth = mockServices.auth.mock();
    auth.getPluginRequestToken.mockResolvedValue({ token: 'bar' });
    discovery.getBaseUrl.mockResolvedValue('http://backend.example.com');
    factory = TechDocsCollatorFactory.fromConfig(new ConfigReader({}), {
      auth,
      discovery,
      logger: mockServices.logger.mock(),
    });
    const entities = mockEntities.filter(
      e => e.metadata.annotations?.['backstage.io/techdocs-ref'],
    );
    worker.use(
      ...entities.map(e =>
        rest.get(
          `http://backend.example.com/static/docs/default/${e.kind}/${e.metadata.name}/search/search_index.json`,
          (_, res, ctx) => res(ctx.status(200), ctx.json(mockSearchDocIndex)),
        ),
      ),
      ...entities.map(e =>
        rest.get(
          `http://backend.example.com/static/docs/default/${e.kind}/${e.metadata.name}/techdocs_metadata.json`,
          (_, res, ctx) => res(ctx.status(200), ctx.json({ foo: 'bar' })),
        ),
      ),
      rest.get('http://backend.example.com/entities', (req, res, ctx) => {
        const offset = parseInt(req.url.searchParams.get('offset') || '0', 10);
        const limit = parseInt(req.url.searchParams.get('limit') || '500', 10);
        if (limit === 50) {
          if (offset === 0) {
            return res(ctx.status(200), ctx.json(Array(50).fill({})));
          }
          return res(ctx.status(200), ctx.json(mockEntities));
        }
        return res(
          ctx.status(200),
          ctx.json(mockEntities.slice(offset, limit + offset)),
        );
      }),
    );
  });

  it('fetches from the configured catalog and techdocs services', async () => {
    const results = await testCollatingTransformingPipeline({
      collatorFactory: factory,
    });
    expect(discovery.getBaseUrl).toHaveBeenCalledWith('catalog');
    expect(discovery.getBaseUrl).toHaveBeenCalledWith('techdocs');
    expect(results).toHaveLength(24);
    expect(results).toEqual(expect.arrayContaining(mockPipelineResults));
  });
});
