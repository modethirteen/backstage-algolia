import { assertError } from '@backstage/errors';
import { Indexer } from './Indexer';
import { Pipeline } from './Pipeline';
import { TransformerFactory, CollatorFactory } from './types';
import {
  LoggerService,
  SchedulerService,
  SchedulerServiceTaskScheduleDefinition,
} from '@backstage/backend-plugin-api';

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

export interface PipelineOptionsInterface
  extends SchedulerServiceTaskScheduleDefinition {
  id: string;
  collatorFactory: CollatorFactory;
  transformerFactories: TransformerFactory[];
  indexer: Indexer;
  done?: () => Promise<void>;
}

export interface PipelineTriggerInterface {
  getPipelineIds(): Promise<string[]>;
  start(options?: { ids?: string[] }): Promise<PipelineTriggerResult[]>;
}

export class PipelineTrigger implements PipelineTriggerInterface {
  private readonly logger: LoggerService;
  private readonly scheduler: SchedulerService;

  public constructor(options: {
    logger: LoggerService;
    scheduler: SchedulerService;
  }) {
    const { logger, scheduler } = options;
    this.logger = logger;
    this.scheduler = scheduler;
  }

  public async addScheduledPipeline(options: PipelineOptionsInterface) {
    const { id, collatorFactory, transformerFactories, indexer, done } =
      options;
    return this.scheduler.scheduleTask({
      ...options,
      id: `algolia-pipeline:${id}`,
      fn: async () => {
        const pipeline = new Pipeline({
          collatorFactory,
          transformerFactories,
          indexer,
        });
        try {
          this.logger.info(`Pipeline algolia-pipeline:${id} starting`);
          await pipeline.execute();
          this.logger.info(
            `Pipeline algolia-pipeline:${id} completed successfully`,
          );
        } catch (e) {
          assertError(e);
          this.logger.error(
            `Pipeline algolia-pipeline:${id} failed to complete successfully:`,
            e,
          );
          return;
        }
        if (done) {
          await done();
        }
      },
    });
  }

  public async getPipelineIds() {
    return (await this.scheduler.getScheduledTasks())
      .filter(({ id }) => id.startsWith('algolia-pipeline:'))
      .map(({ id }) => id);
  }

  public async start(options?: { ids?: string[] }) {
    const { ids = [] } = options ?? {};
    const results: PipelineTriggerResult[] = [];
    const pipelineIds = (await this.getPipelineIds()).filter(id =>
      ids.length ? ids.includes(id) : true,
    );
    for (const id of pipelineIds) {
      try {
        await this.scheduler.triggerTask(id);
        results.push({ id, status: 'ok' });
      } catch (e) {
        assertError(e);
        results.push({
          id,
          error: new PipelineTriggerError(id, e.message),
          status: 'error',
        });
      }
    }
    return results;
  }
}
