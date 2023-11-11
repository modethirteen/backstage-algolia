import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';
import { PipelineTrigger } from '../pipelines';
import { TaskScheduler } from '@backstage/backend-tasks';
import { ConfigReader } from '@backstage/config';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({ service: 'algolia-backend' });
  logger.debug('Starting application server...');
  const config = new ConfigReader({
    backend: {
      database: {
        client: 'better-sqlite3',
        connection: ':memory:',
      },
    },
  });
  const router = await createRouter({
    trigger: new PipelineTrigger({
      logger,
      taskScheduler: TaskScheduler
        .fromConfig(config)
        .forPlugin('algolia-backend'),
    }),
  });
  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/api/algolia', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }
  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
