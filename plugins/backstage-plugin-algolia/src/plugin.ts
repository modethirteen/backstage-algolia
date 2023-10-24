import {
  configApiRef,
  createApiFactory,
  createComponentExtension,
  createPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { searchProxyApiRef, SearchProxyClient } from './api';
import { searchApiRef } from '@backstage/plugin-search-react';

export const algoliaPlugin = createPlugin({
  id: 'algolia',
  apis: [
    createApiFactory({
      api: searchProxyApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        config: configApiRef,
      },
      factory: ({ discoveryApi, fetchApi, config }) =>
        new SearchProxyClient({ discoveryApi, fetchApi, config }),
    }),
    createApiFactory({
      api: searchApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        config: configApiRef,
      },
      factory: ({ discoveryApi, fetchApi, config }) =>
        new SearchProxyClient({ discoveryApi, fetchApi, config }),
    }),
  ],
});

export const ClearRefinementsButton = algoliaPlugin.provide(
  createComponentExtension({
    name: 'ClearRefinementsButton',
    component: {
      lazy: () =>
        import('./components/ClearRefinementsButton').then(
          m => m.ClearRefinementsButton,
        ),
    },
  }),
);

export const HierarchalSearchRefinement = algoliaPlugin.provide(
  createComponentExtension({
    name: 'HierarchalSearchRefinement',
    component: {
      lazy: () =>
        import('./components/HierarchalSearchRefinement').then(
          m => m.HierarchalSearchRefinement,
        ),
    },
  }),
);

export const SearchBar = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchBar',
    component: {
      lazy: () => import('./components/SearchBar').then(m => m.SearchBar),
    },
  }),
);

export const SearchBreadcrumb = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchBreadcrumb',
    component: {
      lazy: () =>
        import('./components/SearchBreadcrumb').then(m => m.SearchBreadcrumb),
    },
  }),
);

export const SearchContainer = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchContainer',
    component: {
      lazy: () =>
        import('./components/SearchContainer').then(m => m.SearchContainer),
    },
  }),
);

export const SearchHitList = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchHitList',
    component: {
      lazy: () =>
        import('./components/SearchHitList').then(m => m.SearchHitList),
    },
  }),
);

export const SearchRefinement = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchRefinement',
    component: {
      lazy: () =>
        import('./components/SearchRefinement').then(m => m.SearchRefinement),
    },
  }),
);

export const SearchProgress = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchProgress',
    component: {
      lazy: () =>
        import('./components/SearchProgress').then(m => m.SearchProgress),
    },
  }),
);
