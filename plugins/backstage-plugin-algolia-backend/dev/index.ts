import { createBackend } from '@backstage/backend-defaults';
import { createBackendModule } from '@backstage/backend-plugin-api';
import { algoliaBackendExtensionPoint } from 'backstage-plugin-algolia-node';

const algoliaBackendModule = createBackendModule({
  pluginId: 'algolia',
  moduleId: 'algolia-backend-development',
  register(env) {
    env.registerInit({
      deps: {
        algolia: algoliaBackendExtensionPoint,
      },
      async init({ algolia }) {
        algolia.replacePipelines([]);
      },
    });
  },
});

const backend = createBackend();
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('../src'));
backend.add(algoliaBackendModule);
backend.start();
