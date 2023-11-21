import { createDevApp } from '@backstage/dev-utils';
import React from 'react';
import { algoliaPlugin } from '../src/plugin';

createDevApp()
  .registerPlugin(algoliaPlugin)
  .addPage({
    element: <div />,
    title: 'Search',
    path: '/search'
  })
  .render();
