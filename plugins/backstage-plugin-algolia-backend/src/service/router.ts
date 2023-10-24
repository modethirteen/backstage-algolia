import express from 'express';
import Router from 'express-promise-router';
import { body, validationResult } from 'express-validator';
import { InsightsMethodMap } from 'search-insights';
import { ClientFactoryInterface } from '../api/ClientFactory';
import { PipelineTriggerInterface } from '../pipelines';
import { LoggerService } from '@backstage/backend-plugin-api';
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { Config } from '@backstage/config';

export async function createRouter(deps: {
  clientFactory: ClientFactoryInterface;
  config: Config;
  logger: LoggerService;
  trigger: PipelineTriggerInterface;
}): Promise<express.Router> {
  const { clientFactory, config, logger, trigger } = deps;
  const router = Router();
  router.use(express.json());

  router.get('/health', (_, res) => {
    logger.info('PONG!');
    res.json({ status: 'ok' });
  });

  router.get('/pipelines', async (_, res) => {
    res.status(200).json({ pipelines: await trigger.getPipelineIds() });
  });

  router.post(
    '/pipelines',
    [
      body('pipelines').custom(v => {
        if (typeof v === 'undefined') {
          return true;
        }
        if (!Array.isArray(v)) {
          throw new Error('`pipelines` field is not an array');
        }
        if (v.some(i => typeof i !== 'string')) {
          throw new Error('`pipelines` field contains non-string elements');
        }
        return true;
      }),
    ],
    async (req: express.Request, res: express.Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          errors: errors
            .array()
            .map(({ type, msg }) => ({ type, message: msg })),
        });
        return;
      }
      const results = await trigger.start({ ids: req.body?.pipelines ?? [] });
      res.status(results.some(r => r.status === 'error') ? 207 : 200).json({
        pipelines: results.map(({ id, error, status }) => ({
          id,
          status,
          message: error?.message,
        })),
      });
    },
  );

  router.post(
    '/insights',
    [
      body('insightsMethod').isString(),
      body('payload').isObject(),
      body('userToken').custom(
        v => typeof v === 'string' || typeof v === 'number',
      ),
      body('authenticatedUserToken').custom(
        v =>
          typeof v === 'undefined' ||
          typeof v === 'string' ||
          typeof v === 'number',
      ),
    ],
    async (req: express.Request, res: express.Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          errors: errors
            .array()
            .map(({ type, msg }) => ({ type, message: msg })),
        });
        return;
      }
      const {
        insightsMethod,
        payload,
        authenticatedUserToken,
        userToken,
      }: {
        insightsMethod: keyof InsightsMethodMap;
        payload: object;
        userToken: string | number;
        authenticatedUserToken?: string | number;
      } = req.body;
      const insights = clientFactory.newInsightsClient();
      insights(insightsMethod, {
        ...payload,
        authenticatedUserToken,
        userToken,
      });
      res
        .status(202)
        .json({
          message: `Dispatched ${insightsMethod} payload to Algolia Insights API`,
        });
    },
  );

  const middleware = MiddlewareFactory.create({ logger, config });
  router.use(middleware.error());
  return router;
}
