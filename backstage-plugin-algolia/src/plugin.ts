import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const algoliaPlugin = createPlugin({
  id: 'algolia',
  routes: {
    root: rootRouteRef,
  },
});

export const AlgoliaPage = algoliaPlugin.provide(
  createRoutableExtension({
    name: 'AlgoliaPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
