import { getVoidLogger } from '@backstage/backend-common';
import { Indexer } from '../Indexer';
import { objects as mockObjects } from './mocks.json';
import { SearchIndex } from 'algoliasearch';
import { IndexObject } from '../types';
import { Readable, pipeline } from 'stream';

const words = [
  'apple',
  'banana',
  'cherry',
  'date',
  'elderberry',
  'fig',
  'grape',
  'honeydew',
  'kiwi',
  'lemon',
  'mango',
  'orange',
  'pear',
  'quince',
  'raspberry',
  'strawberry',
  'tangerine',
  'watermelon',
];

const generateText = (wordCount: number) =>  Array.from({ length: wordCount }, (_, i) => words[i % words.length]).join(' ');

const testPipeline = async (objects: (IndexObject | undefined)[], indexer: Indexer) => {
  const items = [...objects];
  const objectStream = new Readable({
    objectMode: true,
    read() {
      const item = items.shift();
      this.push(item ? item : null);
    },
  });
  await new Promise<void>((resolve, reject) => {
    pipeline(objectStream, indexer, (e) => {
      if (e) {
        reject(e);
      } else {
        resolve();
      }
    });
  });
};

const saveObjects = jest.fn();

describe('Indexer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can include timestamp in index objects', async () => {
    const indexer = new Indexer({
      batchSize: mockObjects.length,
      chunk: false,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testPipeline(mockObjects, indexer);
    expect(saveObjects).toHaveBeenCalled();
    const timestamps = Array.from(saveObjects.mock.calls[0][0])
      .map((o: any) => o.timestamp);
    expect(timestamps.length).toEqual(18);
    timestamps.map(t => expect(t).toEqual('2023-11-09T01:25:23.000Z'));
  });

  it('can include object ids in index objects', async () => {
    const indexer = new Indexer({
      batchSize: mockObjects.length,
      chunk: false,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testPipeline(mockObjects, indexer);
    expect(saveObjects).toHaveBeenCalled();
    const ids = Array.from(saveObjects.mock.calls[0][0])
      .map((o: any) => o.objectID);
    expect(ids.length).toEqual(18);
    ids.map(t => expect(t).toBeDefined());
  });

  it('can ignore object that is too large', async () => {
    const object = {
      source: 'bar',
      title: 'plugh',
      location: 'xyzzy',
      path: 'fred',
      text: generateText(200),
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'foobar',
      },
    };
    const indexer = new Indexer({
      batchSize: 1,
      chunk: false,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 50,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testPipeline([object], indexer);
    expect(saveObjects).not.toHaveBeenCalled();
  });

  it('can split up object and send in chunks', async () => {
    const objects = [{
      source: 'bar',
      title: 'bazz',
      location: 'https://example.com/a/b/c',
      path: 'a/b/c',
      text: generateText(4000),
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'hydro',
      },
    }, {
      source: 'bar',
      title: 'plugh',
      location: 'https://example.com/d/e/f',
      path: 'd/e/f',
      text: generateText(8000),
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'flask',
      },
    }];
    const indexer = new Indexer({
      batchSize: 2,
      chunk: true,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testPipeline(objects, indexer);
    expect(saveObjects).toHaveBeenCalled();
    const results = Array.from(saveObjects.mock.calls[0][0])
    expect(results.length).toEqual(89);
  });

  it('can handle undefined object', async () => {
    const objects = [{
      source: 'bar',
      title: 'bazz',
      location: 'https://example.com/a/b/c',
      path: 'a/b/c',
      text: generateText(4000),
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'hydro',
      },
    }, {
      source: 'bar',
      title: 'plugh',
      location: 'https://example.com/d/e/f',
      path: 'd/e/f',
      text: generateText(8000),
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'flask',
      },
    },
    undefined];
    const indexer = new Indexer({
      batchSize: 2,
      chunk: true,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testPipeline(objects, indexer);
    expect(saveObjects).toHaveBeenCalled();
    const results = Array.from(saveObjects.mock.calls[0][0])
    expect(results.length).toEqual(89);
  });
});
