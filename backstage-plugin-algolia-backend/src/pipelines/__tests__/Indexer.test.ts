import { getVoidLogger } from '@backstage/backend-common';
import { Indexer } from '../Indexer';
import { objects as mockObjects } from './mocks.json';
import { SearchIndex } from 'algoliasearch';

const saveObjects = jest.fn();

describe('Indexer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can include timestamp in index objects', async () => {
    const indexer = new Indexer({
      batchSize: 10,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await indexer.index(mockObjects);
    expect(saveObjects).toHaveBeenCalled();
    const timestamps = Array.from(saveObjects.mock.calls[0][0])
      .map((o: any) => o.timestamp);
    expect(timestamps.length).toEqual(18);
    timestamps.map(t => expect(t).toEqual('2023-11-09T01:25:23.000Z'));
  });
});
