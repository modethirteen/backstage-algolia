import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import { SearchIndex } from 'algoliasearch';
import { IndexManager } from '../';
import { techdocsPipelineResults as mockPipelineResults } from './mocks.json';

const mockObjectsWithTimestamp = mockPipelineResults.map(r => ({
  ...r.indexObject,
  timestamp: '2023-09-15T11:12:58+0000'
}));
const browseObjects = jest.fn(({ batch }) => batch(mockObjectsWithTimestamp));
const deleteObjects = jest.fn();

describe('IndexManager', () => {
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
              expirations: [{
                source: 'mkdocs',
                ttl: 'P6M',
              }, {
                source: 'coda',
                ttl: 'P1D',
              }],
            },
          },
        },
      },
    });
    const indexManager = IndexManager.fromConfig(config, {
      date: new Date('2023-12-01T20:21:34Z'),
      index: 'techdocs',
      logger: getVoidLogger(),
    });
    expect(indexManager.expirations).toEqual([{
      source: 'mkdocs',
      ttl: 15811200,
    }, {
      source: 'coda',
      ttl: 86400,
    }]);
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
              expirations: [{
                source: 'mkdocs',
                ttl: 'P6M',
              }, {
                source: 'coda',
                ttl: 'P1D',
              }],
            },
          },
        },
      },
    });
    const indexManager = IndexManager.fromConfig(config, {
      date: new Date('2023-12-01T20:21:34Z'),
      index: 'techdocs',
      logger: getVoidLogger(),
      filter: {
        sources: ['coda'],
      },
    });
    expect(indexManager.expirations).toEqual([{
      source: 'coda',
      ttl: 86400,
    }]);
  });

  it('can clean expired index objects', async () => {
    const indexManager = new IndexManager({
      expirations: [{
        source: 'foo',
        ttl: 86400 * 30,
      }, {
        source: 'bar',
        ttl: 3600,
      }],
      logger: getVoidLogger(),
      now: new Date('2023-10-03T11:12:58+0000'),
      searchIndex: {
        browseObjects,
        deleteObjects,
      } as unknown as SearchIndex,
    });
    await indexManager.clean();
    expect(browseObjects).toHaveBeenCalledTimes(2);
    expect(browseObjects.mock.calls[0][0]).toEqual(expect.objectContaining({
      query: '',
      filters: 'source:foo',
      attributesToRetrieve: ['timestamp'],
    }));
    expect(browseObjects.mock.calls[1][0]).toEqual(expect.objectContaining({
      query: '',
      filters: 'source:bar',
      attributesToRetrieve: ['timestamp'],
    }));
    expect(deleteObjects).toHaveBeenCalledTimes(2);
    expect(deleteObjects.mock.calls[0][0].length).toEqual(0);
    expect(deleteObjects.mock.calls[1][0].length).toEqual(24);
  });
});
