import { PipelineTrigger } from '../PipelineTrigger';

const triggerTask = jest.fn();
const getScheduledTasks = jest.fn();

const trigger = new PipelineTrigger({
  taskScheduler: {
    triggerTask,
    scheduleTask: jest.fn(),
    createScheduledTaskRunner: jest.fn(),
    getScheduledTasks,
  },
});

describe('PipelineTrigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can trigger scheduled tasks', async () => {
    getScheduledTasks.mockResolvedValue([{ id: 'foo' }, { id: 'bar' }]);
    await trigger.start();
    expect(getScheduledTasks).toHaveBeenCalled();
    expect(triggerTask).toHaveBeenCalledTimes(2);
  });
});