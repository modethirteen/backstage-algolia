import {
  PluginEndpointDiscovery,
  TokenManager,
  getVoidLogger,
} from '@backstage/backend-common';
import { setupRequestMockHandlers } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { testCollatingBuildingPipeline } from '../../dev';
import { TechDocsCollatorFactory } from '../TechDocsCollatorFactory';
import { CollatorResult } from '../types';
import {
  collatorResults as mockCollatorResults,
  entities as mockEntities,
  searchDocIndex as mockSearchDocIndex,
} from './mocks.json';

const config = new ConfigReader({
  app: {
    baseUrl: 'htts://dev.example.com',
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

describe('TechDocsCollatorFactory', () => {
  const worker = setupServer();
  setupRequestMockHandlers(worker);
  beforeEach(async () => {
    jest.clearAllMocks();
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
    const results = await testCollatingBuildingPipeline({ collatorFactory: factory }) as CollatorResult[];
    expect(mockDiscoveryApi.getBaseUrl).toHaveBeenCalledWith('catalog');
    expect(mockDiscoveryApi.getBaseUrl).toHaveBeenCalledWith('techdocs');
    expect(results).toHaveLength(24);
    expect(results).toEqual(expect.arrayContaining(mockCollatorResults));
  });
});
