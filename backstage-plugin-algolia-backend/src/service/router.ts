import {
  errorHandler,
} from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';

export interface RouterOptions {
}

export async function createRouter({}: RouterOptions): Promise<express.Router> {
  const router = Router();

  // stub the indexer endpoint for later implementation
  router.get('/', async (_, res) => {
    res.json({});
  });
  router.use(errorHandler());
  return router;
}
