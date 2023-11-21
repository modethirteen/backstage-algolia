import { createComponentExtension, createPlugin } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const algoliaPlugin = createPlugin({
  id: 'algolia',
  routes: {
    root: rootRouteRef,
  },
});

export const ClearRefinementsButton = algoliaPlugin.provide(
  createComponentExtension({
    name: 'ClearRefinementsButton',
    component: {
      lazy: () => import('./components/ClearRefinementsButton')
        .then(m => m.ClearRefinementsButton)
    },
  }),
);

export const HierarchalSearchRefinement = algoliaPlugin.provide(
  createComponentExtension({
    name: 'HierarchalSearchRefinement',
    component: {
      lazy: () => import('./components/HierarchalSearchRefinement')
        .then(m => m.HierarchalSearchRefinement)
    },
  }),
);

export const SearchBar = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchBar',
    component: {
      lazy: () => import('./components/SearchBar')
        .then(m => m.SearchBar)
    },
  }),
);

export const SearchBreadcrumb = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchBreadcrumb',
    component: {
      lazy: () => import('./components/SearchBreadcrumb')
        .then(m => m.SearchBreadcrumb)
    },
  }),
);

export const SearchHitList = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchHitList',
    component: {
      lazy: () => import('./components/SearchHitList')
        .then(m => m.SearchHitList)
    },
  }),
);

export const SearchRefinement = algoliaPlugin.provide(
  createComponentExtension({
    name: 'SearchRefinement',
    component: {
      lazy: () => import('./components/SearchRefinement')
        .then(m => m.SearchRefinement)
    },
  }),
);
