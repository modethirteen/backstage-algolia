import { getVoidLogger } from '@backstage/backend-common';
import { CollatorFactory, Indexer, PipelineTrigger } from '../';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can register pipeline', async () => {
    trigger.addScheduledPipeline({
      id: 'xyzzy',
      collatorFactory: {} as CollatorFactory,
      builderFactories: [],
      indexer: {} as Indexer,
      frequency: { minutes: 60 },
      timeout: { minutes: 5 },
      initialDelay: { seconds: 30 },
    });
    expect(scheduleTask).toHaveBeenCalled();
  });

  it('can trigger pipelines', async () => {
    getScheduledTasks.mockResolvedValue([{
      id: 'algolia-pipeline:foo'
    }, {
      id: 'algolia-pipeline:bar'
    }, {
      id: 'fred'
    }]);
    await trigger.start();
    expect(getScheduledTasks).toHaveBeenCalled();
    expect(triggerTask).toHaveBeenCalledTimes(2);
  });

  it('can trigger pipelines by ids', async () => {
    getScheduledTasks.mockResolvedValue([{
      id: 'algolia-pipeline:foo'
    }, {
      id: 'algolia-pipeline:bar'
    }, {
      id: 'fred'
    }]);
    await trigger.start({ ids: ['algolia-pipeline:bar' ]});
    expect(getScheduledTasks).toHaveBeenCalled();
    expect(triggerTask).toHaveBeenCalledTimes(1);
  });
});