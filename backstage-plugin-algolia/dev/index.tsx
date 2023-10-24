import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { algoliaPlugin, AlgoliaPage } from '../src/plugin';

createDevApp()
  .registerPlugin(algoliaPlugin)
  .addPage({
    element: <AlgoliaPage />,
    title: 'Root Page',
    path: '/algolia'
  })
  .render();
