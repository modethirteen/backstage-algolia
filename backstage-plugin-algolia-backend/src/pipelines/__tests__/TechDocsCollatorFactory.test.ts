import { TechDocsCollatorFactory } from '../TechDocsCollatorFactory';
import {
  PluginEndpointDiscovery,
  getVoidLogger,
  TokenManager,
} from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import { setupRequestMockHandlers } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import {
  entities as mockEntities,
  search as mockSearchDocIndex,
} from './mocks.json';
import { testPipeline } from './util';
import { CollatorResult } from '../types';

describe('TechDocsCollatorFactory', () => {
  const worker = setupServer();
  setupRequestMockHandlers(worker);
  const config = new ConfigReader({
    app: {
      baseUrl: 'htts://portal.example.com',
    },
  });
  const mockDiscoveryApi: jest.Mocked<PluginEndpointDiscovery> = {
    getBaseUrl: jest.fn().mockResolvedValue('http://backend.example.com'),
    getExternalBaseUrl: jest.fn(),
  };
  const mockTokenManager: jest.Mocked<TokenManager> = {
    getToken: jest.fn().mockResolvedValue({ token: 'bar' }),
    authenticate: jest.fn(),
  };
  const options = {
    discovery: mockDiscoveryApi,
    logger: getVoidLogger(),
    tokenManager: mockTokenManager,
  };
  let factory: TechDocsCollatorFactory;

  beforeEach(async () => {
    factory = TechDocsCollatorFactory.fromConfig(config, options);
    worker.use(
      ...mockEntities
        .filter(e => e.metadata.annotations?.['backstage.io/techdocs-ref'])
        .map(e => rest.get(
          `http://backend.example.com/static/docs/default/${e.kind}/${e.metadata.name}/search/search_index.json`,
          (_, res, ctx) => res(ctx.status(200), ctx.json(mockSearchDocIndex)),
        )),
      rest.get('http://backend.example.com/entities', (req, res, ctx) => {
        const offset = parseInt(
          req.url.searchParams.get('offset') || '0',
          10,
        );
        const limit = parseInt(
          req.url.searchParams.get('limit') || '500',
          10,
        );
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
    const results = await testPipeline({ collatorFactory: factory }) as CollatorResult[];
    expect(mockDiscoveryApi.getBaseUrl).toHaveBeenCalledWith('catalog');
    expect(mockDiscoveryApi.getBaseUrl).toHaveBeenCalledWith('techdocs');
    expect(results).toHaveLength(18);
    const expected = mockEntities
      .filter(entity => entity.metadata.annotations?.['backstage.io/techdocs-ref'])
      .map(entity => mockSearchDocIndex.docs.map(doc => ({ entity, doc, source: 'mkdocs' })))
      .flat();
    expect(results).toEqual(expect.arrayContaining(expected));
  });
});
