import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { PipelineTriggerInterface } from '../pipelines';

export interface RouterOptions {
  logger: Logger;
  trigger: PipelineTriggerInterface;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, trigger } = options;
  const router = Router();
  router.use(express.json());
  router.post('/index', async (_, response) => {
    logger.debug('Incoming request to trigger Algolia reindexing');
    const errors = await trigger.start();
    for (const error of errors) {
      logger.warn(`Could not trigger Algolia pipeline ${error.id}: ${error.message}`);
    }
    response.status(errors.length ? 207 : 200);
    response.json(errors.map(({ id, message }) => ({ id, message })));
  });
  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });
  router.use(errorHandler());
  return router;
}
