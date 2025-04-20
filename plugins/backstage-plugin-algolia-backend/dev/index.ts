import { getRootLogger } from '@backstage/backend-common';
import {
  HostDiscovery,
  ServerTokenManager,
  createServiceBuilder,
  loadBackendConfig,
} from '@backstage/backend-common';
import { TaskScheduler } from '@backstage/backend-tasks';
import yn from 'yn';
import { ClientFactory } from '../src/api/ClientFactory';
import {
  Indexer,
  PipelineTrigger,
  TechDocsTransformerFactory,
  TechDocsCollatorFactory,
} from '../src/pipelines';
import { createRouter } from '../src/service/router';

const port = process.env.PLUGIN_PORT ? Number(process.env.PLUGIN_PORT) : 7007;
const rootLogger = getRootLogger();

const startBackend = async () => {
  const logger = rootLogger.child({ service: 'algolia-backend' });
  logger.debug('Starting application server...');
  const config = await loadBackendConfig({ logger, argv: process.argv });
  const discovery = HostDiscovery.fromConfig(config);
  const tokenManager = yn(process.env.PLUGIN_BACKEND_AUTH, { default: false })
    ? ServerTokenManager.fromConfig(config, { logger })
    : ServerTokenManager.noop();
  const taskScheduler = TaskScheduler.fromConfig(config).forPlugin('algolia');
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
    transformerFactories: [TechDocsTransformerFactory.fromConfig(config)],
    indexer: Indexer.fromConfig(config, {
      batchSize: 10,
      index: 'techdocs',
      logger,
    }),
    frequency: { minutes: 15 },
    timeout: { minutes: 5 },
  });
  const router = await createRouter({
    clientFactory: ClientFactory.fromConfig(config),
    trigger,
  });
  let service = createServiceBuilder(module)
    .setPort(port)
    .addRouter('/api/algolia', router)
    .enableCors({ origin: 'http://localhost:3000' });
  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
};

startBackend().catch(err => {
  rootLogger.error(err);
  process.exit(1);
});

process.on('SIGINT', () => {
  rootLogger.info('CTRL+C pressed; exiting.');
  process.exit(0);
});
