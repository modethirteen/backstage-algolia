import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';
import {
  CatalogCollatorFactory,
  CatalogTransformerFactory,
  ClientFactory,
  Indexer,
  IndexManager,
  PipelineOptionsInterface,
  PipelineTrigger,
  TechDocsCollatorFactory,
  TechDocsTransformerFactory,
} from 'backstage-plugin-algolia-node';
import {
  algoliaBackendExtensionPoint,
  AlgoliaBackendQueryResultsHandler,
} from 'backstage-plugin-algolia-node';

export const algoliaPlugin = createBackendPlugin({
  pluginId: 'algolia',
  register(env) {
    let queryResultsHandler: AlgoliaBackendQueryResultsHandler | undefined;
    let initialPipelines: PipelineOptionsInterface[] | undefined;
    const addedPipelines: PipelineOptionsInterface[] = [];
    env.registerExtensionPoint(algoliaBackendExtensionPoint, {
      addQueryResultsHandler(handler) {
        queryResultsHandler = handler;
      },
      replacePipelines(pipelines) {
        initialPipelines = pipelines;
      },
      addPipeline(...pipelines) {
        addedPipelines.push(...pipelines);
      },
    });
    env.registerInit({
      deps: {
        auth: coreServices.auth,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery,
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        scheduler: coreServices.scheduler,
        lifecycle: coreServices.rootLifecycle,
      },
      async init({ auth, config, discovery, httpRouter, logger, scheduler, lifecycle }) {
        const trigger = new PipelineTrigger({
          logger,
          scheduler,
        });
        lifecycle.addStartupHook(() => {
          const indexes = config.getConfig('algolia.backend.indexes');
          if (!initialPipelines) {
            initialPipelines = [
              ...(indexes.has('techdocs')
                ? [
                    {
                      id: 'techdocs',
                      collatorFactory: TechDocsCollatorFactory.fromConfig(
                        config,
                        {
                          auth,
                          discovery,
                          logger,
                        },
                      ),
                      transformerFactories: [
                        TechDocsTransformerFactory.fromConfig(config),
                      ],
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
                    },
                  ]
                : []),
              ...(indexes.has('catalog')
                ? [
                    {
                      id: 'catalog',
                      collatorFactory: CatalogCollatorFactory.fromConfig(config, {
                        auth,
                        discovery,
                        logger,
                      }),
                      transformerFactories: [
                        CatalogTransformerFactory.fromConfig(config),
                      ],
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
                    },
                  ]
                : []),
            ];
          }
          for (const pipeline of [...initialPipelines, ...addedPipelines]) {
            trigger.addScheduledPipeline(pipeline);
          }
        });
        const router = await createRouter({
          config,
          logger,
          trigger,
          clientFactory: ClientFactory.fromConfig(config),
          queryResultsHandler,
        });
        httpRouter.use(router);
      },
    });
  },
});
