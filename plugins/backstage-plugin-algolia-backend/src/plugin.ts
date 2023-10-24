import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';
import {
  CatalogCollatorFactory,
  CatalogTransformerFactory,
  Indexer,
  IndexManager,
  PipelineTrigger,
  TechDocsCollatorFactory,
  TechDocsTransformerFactory,
} from './pipelines';
import { ClientFactory } from './api/ClientFactory';

export const algoliaPlugin = createBackendPlugin({
  pluginId: 'algolia',
  register(env) {
    env.registerInit({
      deps: {
        auth: coreServices.auth,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery,
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        scheduler: coreServices.scheduler,
      },
      async init({ auth, config, discovery, httpRouter, logger, scheduler }) {
        const trigger = new PipelineTrigger({
          logger,
          scheduler,
        });
        trigger.addScheduledPipeline({
          id: 'techdocs',
          collatorFactory: TechDocsCollatorFactory.fromConfig(config, {
            auth,
            discovery,
            logger,
          }),
          transformerFactories: [TechDocsTransformerFactory.fromConfig(config)],
          indexer: Indexer.fromConfig(config, {
            batchSize: 50,
            index: 'techdocs',
            logger,
          }),
          frequency: { minutes: 60 },
          timeout: { minutes: 15 },
          initialDelay: { seconds: 30 },
          done: async () => {
            const manager = IndexManager.fromConfig(config, {
              index: 'techdocs',
              logger,
              date: new Date(),
            });
            await manager.clean();
          },
        });
        trigger.addScheduledPipeline({
          id: 'catalog',
          collatorFactory: CatalogCollatorFactory.fromConfig(config, {
            auth,
            discovery,
            logger,
          }),
          transformerFactories: [CatalogTransformerFactory.fromConfig(config)],
          indexer: Indexer.fromConfig(config, {
            batchSize: 50,
            index: 'catalog',
            logger,
          }),
          frequency: { minutes: 60 },
          timeout: { minutes: 15 },
          initialDelay: { seconds: 30 },
          done: async () => {
            const manager = IndexManager.fromConfig(config, {
              index: 'catalog',
              logger,
              date: new Date(),
            });
            await manager.clean();
          },
        });
        const router = await createRouter({
          config,
          logger,
          trigger,
          clientFactory: ClientFactory.fromConfig(config),
        });
        httpRouter.use(router);
      },
    });
  },
});
