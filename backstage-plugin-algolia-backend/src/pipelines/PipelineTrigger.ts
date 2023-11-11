import { PluginTaskScheduler, TaskScheduleDefinition } from '@backstage/backend-tasks';
import { isError } from '@backstage/errors';
import { BuilderFactory, CollatorFactory } from './types';
import { Indexer } from './Indexer';
import { Pipeline } from './Pipeline';
import { Logger } from 'winston';

export class PipelineTriggerError extends Error {
  public readonly id: string;

  public constructor(id: string, message: string) {
    super(message);
    this.id = id;
  }
}

interface PipelineTriggerResult {
  error?: PipelineTriggerError;
  id: string;
  status: 'ok' | 'error';
}

export interface PipelineTriggerInterface {
  getPipelineIds(): Promise<string[]>;
  start(options?: { ids?: string[]; }): Promise<PipelineTriggerResult[]>;
}

export class PipelineTrigger implements PipelineTriggerInterface {
  private readonly logger: Logger;
  private readonly taskScheduler: PluginTaskScheduler;

  public constructor(options: {
    logger: Logger;
    taskScheduler: PluginTaskScheduler;
  }) {
    const { logger, taskScheduler } = options;
    this.logger = logger;
    this.taskScheduler = taskScheduler;
  }

  public addScheduledPipeline(
    id: string,
    pipeline: {
      collatorFactory: CollatorFactory;
      builderFactories: BuilderFactory[];
      indexer: Indexer;
    },
    schedule: TaskScheduleDefinition,
  ) {
    const { collatorFactory, builderFactories, indexer } = pipeline;
    this.taskScheduler.scheduleTask({
      id: `algolia-pipeline:${id}`,
      ...schedule,
      fn: () => {
        const pipeline = new Pipeline({
          logger: this.logger,
          collatorFactory,
          builderFactories,
          indexer,
        });
        pipeline.execute();
      },
    });
  }

  public async getPipelineIds() {
    return (await this.taskScheduler.getScheduledTasks())
      .filter(({ id }) => id.startsWith('algolia-pipeline:'))
      .map(({ id }) => id);
  }

  public async start(options?: { ids?: string[]; }) {
    const { ids = [] } = options ?? {};
    const results: PipelineTriggerResult[] = [];
    const pipelineIds = (await this.getPipelineIds())
      .filter(id => ids.length ? ids.includes(id) : true);
    for (const id of pipelineIds) {
      try {
        await this.taskScheduler.triggerTask(id);
        results.push({ id, status: 'ok' });
      } catch (e) {
        if (isError(e)) {
          results.push({
            id,
            error: new PipelineTriggerError(e.message, id),
            status: 'error',
          });
        }
      }
    }
    return results;
  }
}
