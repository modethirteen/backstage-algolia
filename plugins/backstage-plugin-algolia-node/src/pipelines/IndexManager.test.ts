import { ConfigReader } from '@backstage/config';
import { SearchIndex } from 'algoliasearch';
import { techdocsPipelineResults as mockPipelineResults } from '../test/mocks.json';
import { mockServices } from '@backstage/backend-test-utils';
import { IndexManager } from './IndexManager';

describe('IndexManager', () => {
  const mockObjectsWithTimestamp = mockPipelineResults.map(r => ({
    ...r.indexObject,
    timestamp: '2023-09-15T11:12:58+0000',
  }));
  const browseObjects = jest.fn(({ batch }) => batch(mockObjectsWithTimestamp));
  const deleteObjects = jest.fn();
  const logger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can be constructed from ISO8601 duration values', () => {
    const config = new ConfigReader({
      algolia: {
        backend: {
          apikey: 'plugh',
          applicationId: 'fred',
          indexes: {
            techdocs: {
              name: 'xyzzy',
              expirations: [
                {
                  type: 'mkdocs',
                  ttl: 'P6M',
                },
                {
                  type: 'coda',
                  ttl: 'P1D',
                },
              ],
            },
          },
        },
      },
    });
    const indexManager = IndexManager.fromConfig(config, {
      date: new Date('2023-12-01T20:21:34Z'),
      index: 'techdocs',
      logger,
    });
    expect(indexManager.expirations).toEqual([
      {
        type: 'mkdocs',
        ttl: 15811200,
      },
      {
        type: 'coda',
        ttl: 86400,
      },
    ]);
  });

  it('can be constructed with filtered sources', () => {
    const config = new ConfigReader({
      algolia: {
        backend: {
          apikey: 'plugh',
          applicationId: 'fred',
          indexes: {
            techdocs: {
              name: 'xyzzy',
              expirations: [
                {
                  type: 'mkdocs',
                  ttl: 'P6M',
                },
                {
                  type: 'coda',
                  ttl: 'P1D',
                },
              ],
            },
          },
        },
      },
    });
    const indexManager = IndexManager.fromConfig(config, {
      date: new Date('2023-12-01T20:21:34Z'),
      index: 'techdocs',
      logger,
      filter: {
        sources: ['coda'],
      },
    });
    expect(indexManager.expirations).toEqual([
      {
        type: 'coda',
        ttl: 86400,
      },
    ]);
  });

  it('can clean expired index objects', async () => {
    const indexManager = new IndexManager({
      expirations: [
        {
          type: 'foo',
          ttl: 86400 * 30,
        },
        {
          type: 'bar',
          ttl: 3600,
        },
      ],
      logger,
      now: new Date('2023-10-03T11:12:58+0000'),
      searchIndex: {
        browseObjects,
        deleteObjects,
      } as unknown as SearchIndex,
    });
    await indexManager.clean();
    expect(browseObjects).toHaveBeenCalledTimes(2);
    expect(browseObjects.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        query: '',
        filters: 'type:foo',
        attributesToRetrieve: ['timestamp'],
      }),
    );
    expect(browseObjects.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: '',
        filters: 'type:bar',
        attributesToRetrieve: ['timestamp'],
      }),
    );
    expect(deleteObjects).toHaveBeenCalledTimes(2);
    expect(deleteObjects.mock.calls[0][0].length).toEqual(0);
    expect(deleteObjects.mock.calls[1][0].length).toEqual(24);
  });
});
