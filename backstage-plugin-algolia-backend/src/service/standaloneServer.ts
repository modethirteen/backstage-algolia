import {
  HostDiscovery,
  ServerTokenManager,
  createServiceBuilder
} from '@backstage/backend-common';
import { TaskScheduler } from '@backstage/backend-tasks';
import { ConfigReader } from '@backstage/config';
import { Server } from 'http';
import { Logger } from 'winston';
import yn from 'yn';
import {
  Indexer,
  PipelineTrigger,
  TechDocsBuilderFactory,
  TechDocsCollatorFactory
} from '../pipelines';
import { createRouter } from './router';

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
    app: {
      baseUrl: 'http://localhost:3000',
    },
    backend: {
      baseUrl: 'http://localhost:7007',
      database: {
        client: 'better-sqlite3',
        connection: ':memory:',
      },
      auth: {
        keys: [
          { secret: process.env.BACKSTAGE_BACKEND_AUTH_SECRET },
        ],
      },
    },
    algolia: {
      backend: {
        apikey: process.env.BACKSTAGE_ALGOLIA_ADMIN_APIKEY,
        applicationId: process.env.BACKSTAGE_ALGOLIA_APPLICATION_ID,
        indexes: {
          techdocs: {
            name: process.env.BACKSTAGE_ALGOLIA_TECHDOCS_INDEX_NAME,
          },
        },
        maxObjectSizeBytes: 10000,
        chunk: true,
      },
    },
  });
  const discovery = HostDiscovery.fromConfig(config);
  const tokenManager = yn(process.env.PLUGIN_BACKEND_AUTH, { default: false })
    ? ServerTokenManager.fromConfig(config, { logger })
    : ServerTokenManager.noop();
  const taskScheduler = TaskScheduler
    .fromConfig(config)
    .forPlugin('algolia-backend');
  const trigger = new PipelineTrigger({
    logger,
    taskScheduler,
  });
  trigger.addScheduledPipeline({
    id: 'development',
    collatorFactory: TechDocsCollatorFactory.fromConfig(config, {
      discovery,
      logger,
      tokenManager,
    }),
    builderFactories: [
      TechDocsBuilderFactory.fromConfig(config),
    ],
    indexer: Indexer.fromConfig(config, {
      batchSize: 10,
      index: 'techdocs',
      logger,
    }),
    frequency: { minutes: 15 },
    timeout: { minutes: 5 },
  });
  const router = await createRouter({ trigger });
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
