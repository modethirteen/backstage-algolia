import { Entity } from '@backstage/catalog-model';
import { SearchIndex } from 'algoliasearch';
import { testIndexingPipeline } from '../test/utils';
import { techdocsPipelineResults as mockPipelineResults } from '../test/mocks.json';
import { mockServices } from '@backstage/backend-test-utils';
import { Indexer } from './Indexer';
import { PipelineResult } from './types';
import { IndexObject } from 'backstage-plugin-algolia-common';

describe('Indexer', () => {
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
  const saveObjects = jest.fn();
  const logger = mockServices.logger.mock();

  const generateText = (wordCount: number) =>
    Array.from({ length: wordCount }, (_, i) => words[i % words.length]).join(
      ' ',
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can include timestamp in index objects', async () => {
    const indexer = new Indexer({
      batchSize: mockPipelineResults.length,
      chunk: false,
      logger,
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({ results: mockPipelineResults, indexer });
    expect(saveObjects).toHaveBeenCalled();
    const timestamps = Array.from(saveObjects.mock.calls[0][0]).map(
      (o: any) => o.timestamp,
    );
    expect(timestamps.length).toEqual(24);
    timestamps.map(t => expect(t).toEqual('2023-11-09T01:25:23.000Z'));
  });

  it('can include object ids in index objects', async () => {
    const indexer = new Indexer({
      batchSize: mockPipelineResults.length,
      chunk: false,
      logger,
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({ results: mockPipelineResults, indexer });
    expect(saveObjects).toHaveBeenCalled();
    const ids = Array.from(saveObjects.mock.calls[0][0]).map(
      (o: any) => o.objectID,
    );
    expect(ids.length).toEqual(24);
    ids.map(t => expect(t).toBeDefined());
  });

  it('can ignore object that is too large', async () => {
    const object: IndexObject = {
      type: 'bar',
      title: 'plugh',
      location: 'xyzzy',
      path: 'xyzzy',
      text: generateText(200),
      kind: 'component',
      namespace: 'default',
      name: 'foobar',
      keywords: [],
    };
    const indexer = new Indexer({
      batchSize: 1,
      chunk: false,
      logger,
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
    const objects: IndexObject[] = [
      {
        type: 'bar',
        title: 'bazz',
        location: 'https://example.com/a/b/c',
        path: 'a/b/c',
        text: generateText(4000),
        kind: 'component',
        namespace: 'default',
        name: 'hydro',
        keywords: [],
      },
      {
        type: 'bar',
        title: 'plugh',
        location: 'https://example.com/d/e/f',
        path: 'd/e/f',
        text: generateText(8000),
        kind: 'component',
        namespace: 'default',
        name: 'flask',
        keywords: [],
      },
    ];
    const indexer = new Indexer({
      batchSize: 2,
      chunk: true,
      logger,
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({
      results: objects.map(o => ({
        indexObject: o,
        entity: {} as Entity,
      })),
      indexer,
    });
    expect(saveObjects).toHaveBeenCalled();
    const results = Array.from(saveObjects.mock.calls[0][0]);
    expect(results.length).toEqual(89);
  });

  it('can handle undefined object', async () => {
    const objects: IndexObject[] = [
      {
        type: 'bar',
        title: 'bazz',
        location: 'https://example.com/a/b/c',
        path: 'a/b/c',
        text: generateText(4000),
        kind: 'component',
        namespace: 'default',
        name: 'hydro',
        keywords: [],
      },
      {
        type: 'bar',
        title: 'plugh',
        location: 'https://example.com/d/e/f',
        path: 'd/e/f',
        text: generateText(8000),
        kind: 'component',
        namespace: 'default',
        name: 'flask',
        keywords: [],
      },
    ];
    const indexer = new Indexer({
      batchSize: 2,
      chunk: true,
      logger,
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({
      results: [
        ...objects.map(o => ({
          indexObject: o,
          entity: {} as Entity,
        })),
        undefined,
      ],
      indexer,
    });
    expect(saveObjects).toHaveBeenCalled();
    const results = Array.from(saveObjects.mock.calls[0][0]);
    expect(results.length).toEqual(89);
  });

  it('will include objects with empty text', async () => {
    const objects: IndexObject[] = [
      {
        type: 'bar',
        title: 'bazz',
        location: 'https://example.com/a/b/c',
        path: 'a/b/c',
        text: '',
        kind: 'component',
        namespace: 'default',
        name: 'hydro',
        keywords: [],
      },
      {
        type: 'bar',
        title: 'plugh',
        location: 'https://example.com/d/e/f',
        path: 'd/e/f',
        text: '',
        kind: 'component',
        namespace: 'default',
        name: 'flask',
        keywords: [],
      },
    ];
    const indexer = new Indexer({
      batchSize: 2,
      chunk: true,
      logger,
      maxObjectSizeBytes: 5000,
      now: new Date('2023-11-09T01:25:23+0000'),
      searchIndex: { saveObjects } as unknown as SearchIndex,
    });
    await testIndexingPipeline({
      results: objects.map(o => ({
        indexObject: o,
        entity: {} as Entity,
      })),
      indexer,
    });
    expect(saveObjects).toHaveBeenCalled();
    const results = Array.from(saveObjects.mock.calls[0][0]);
    expect(results.length).toEqual(2);
  });
});
