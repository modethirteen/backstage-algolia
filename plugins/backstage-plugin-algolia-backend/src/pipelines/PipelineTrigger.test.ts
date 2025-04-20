import { getVoidLogger } from '@backstage/backend-common';
import { CollatorFactory, Indexer, PipelineTrigger } from '.';
import { Readable, Writable } from 'stream';

const triggerTask = jest.fn();
const getScheduledTasks = jest.fn();
const scheduleTask = jest.fn();

const trigger = new PipelineTrigger({
  logger: getVoidLogger(),
  taskScheduler: {
    triggerTask,
    scheduleTask,
    createScheduledTaskRunner: jest.fn(),
    getScheduledTasks,
  },
});

describe('PipelineTrigger', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('can register pipeline', async () => {
    trigger.addScheduledPipeline({
      id: 'xyzzy',
      collatorFactory: {} as CollatorFactory,
      transformerFactories: [],
      indexer: {} as Indexer,
      frequency: { minutes: 60 },
      timeout: { minutes: 5 },
      initialDelay: { seconds: 30 },
    });
    expect(scheduleTask).toHaveBeenCalled();
  });

  it('can trigger pipelines', async () => {
    getScheduledTasks.mockResolvedValue([
      {
        id: 'algolia-pipeline:foo',
      },
      {
        id: 'algolia-pipeline:bar',
      },
      {
        id: 'fred',
      },
    ]);
    await trigger.start();
    expect(getScheduledTasks).toHaveBeenCalled();
    expect(triggerTask).toHaveBeenCalledTimes(2);
  });

  it('can trigger pipelines by ids', async () => {
    getScheduledTasks.mockResolvedValue([
      {
        id: 'algolia-pipeline:foo',
      },
      {
        id: 'algolia-pipeline:bar',
      },
      {
        id: 'fred',
      },
    ]);
    await trigger.start({ ids: ['algolia-pipeline:bar'] });
    expect(getScheduledTasks).toHaveBeenCalled();
    expect(triggerTask).toHaveBeenCalledTimes(1);
  });

  it('can execute done callback', async () => {
    const done = jest.fn();
    trigger.addScheduledPipeline({
      id: 'xyzzy',
      collatorFactory: {
        newCollator: jest.fn().mockResolvedValue(Readable.from([])),
      },
      transformerFactories: [],
      indexer: new Writable({
        objectMode: true,
      }) as Indexer,
      frequency: { minutes: 60 },
      timeout: { minutes: 5 },
      initialDelay: { seconds: 30 },
      done,
    });
    const fn = scheduleTask.mock.calls[0][0].fn as () => Promise<void>;
    await fn();
    expect(done).toHaveBeenCalled();
  });
});
