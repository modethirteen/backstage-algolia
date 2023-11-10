import { PluginTaskScheduler } from '@backstage/backend-tasks';
import { isError } from '@backstage/errors';

export class PipelineTriggerError extends Error {
  public readonly id: string;

  public constructor(id: string, message: string) {
    super(message);
    this.id = id;
  }
}

export interface PipelineTriggerInterface {
  start(): Promise<PipelineTriggerError[]>;
}

export class PipelineTrigger implements PipelineTriggerInterface {
  private readonly taskScheduler: PluginTaskScheduler;

  public constructor(options: { taskScheduler: PluginTaskScheduler }) {
    const { taskScheduler } = options;
    this.taskScheduler = taskScheduler;
  }

  public async start() {
    const errors: PipelineTriggerError[] = [];
    for (const { id } of await this.taskScheduler.getScheduledTasks()) {
      try {
        this.taskScheduler.triggerTask(id);
      } catch (e) {
        if (isError(e)) {
          errors.push(new PipelineTriggerError(e.message, id));
        }
      }
    }
    return errors;
  }
}
