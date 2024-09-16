import { getVoidLogger } from '@backstage/backend-common';
import { Entity } from '@backstage/catalog-model';
import { SearchIndex } from 'algoliasearch';
import { Indexer, PipelineResult } from '../';
import { testIndexingPipeline } from '../../dev';
import { techdocsPipelineResults as mockPipelineResults } from './mocks.json';

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

const saveObjects = jest.fn();

describe('Indexer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can include timestamp in index objects', async () => {
    const indexer = new Indexer({
      batchSize: mockPipelineResults.length,
      chunk: false,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({ results: mockPipelineResults, indexer });
    expect(saveObjects).toHaveBeenCalled();
    const timestamps = Array.from(saveObjects.mock.calls[0][0])
      .map((o: any) => o.timestamp);
    expect(timestamps.length).toEqual(24);
    timestamps.map(t => expect(t).toEqual('2023-11-09T01:25:23.000Z'));
  });

  it('can include object ids in index objects', async () => {
    const indexer = new Indexer({
      batchSize: mockPipelineResults.length,
      chunk: false,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({ results: mockPipelineResults, indexer });
    expect(saveObjects).toHaveBeenCalled();
    const ids = Array.from(saveObjects.mock.calls[0][0])
      .map((o: any) => o.objectID);
    expect(ids.length).toEqual(24);
    ids.map(t => expect(t).toBeDefined());
  });

  it('can ignore object that is too large', async () => {
    const object = {
      source: 'bar',
      title: 'plugh',
      location: 'xyzzy',
      path: 'xyzzy',
      text: generateText(200),
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'foobar',
      },
      keywords: [],
    };
    const indexer = new Indexer({
      batchSize: 1,
      chunk: false,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 50,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    const result: PipelineResult = {
      indexObject: object,
      entity: {} as Entity,
    };
    await testIndexingPipeline({ results: [result], indexer });
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
      keywords: [],
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
      keywords: [],
    }];
    const indexer = new Indexer({
      batchSize: 2,
      chunk: true,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({ results: objects.map(o => ({
      indexObject: o,
      entity: {} as Entity,
    })), indexer });
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
      section: false,
      text: generateText(4000),
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'hydro',
      },
      keywords: [],
    }, {
      source: 'bar',
      title: 'plugh',
      location: 'https://example.com/d/e/f',
      path: 'd/e/f',
      section: false,
      text: generateText(8000),
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'flask',
      },
      keywords: [],
    }];
    const indexer = new Indexer({
      batchSize: 2,
      chunk: true,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({ results: [...objects.map(o => ({
      indexObject: o,
      entity: {} as Entity,
    })), undefined], indexer });
    expect(saveObjects).toHaveBeenCalled();
    const results = Array.from(saveObjects.mock.calls[0][0])
    expect(results.length).toEqual(89);
  });

  it('will include objects with empty text', async () => {
    const objects = [{
      source: 'bar',
      title: 'bazz',
      location: 'https://example.com/a/b/c',
      path: 'a/b/c',
      text: '',
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'hydro',
      },
      keywords: [],
    }, {
      source: 'bar',
      title: 'plugh',
      location: 'https://example.com/d/e/f',
      path: 'd/e/f',
      text: '',
      entity: {
        kind: 'component',
        namespace: 'default',
        name: 'flask',
      },
      keywords: [],
    }];
    const indexer = new Indexer({
      batchSize: 2,
      chunk: true,
      logger: getVoidLogger(),
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({ results: objects.map(o => ({
      indexObject: o,
      entity: {} as Entity,
    })), indexer });
    expect(saveObjects).toHaveBeenCalled();
    const results = Array.from(saveObjects.mock.calls[0][0])
    expect(results.length).toEqual(2);
  });
});
