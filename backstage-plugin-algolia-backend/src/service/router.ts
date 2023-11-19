import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { body, validationResult } from 'express-validator';
import { PipelineTriggerInterface } from '../pipelines';

export interface RouterOptions {
  trigger: PipelineTriggerInterface;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { trigger } = options;
  const router = Router();
  router.use(express.json());

  router.get('/', async (_, res) => {
    res.status(200).json({ pipelines: await trigger.getPipelineIds() });
  });

  router.post('/', [
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
  ], async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      res.status(400).json({
        errors: errors.array()
          .map(({ type, msg }) => ({ type, message: msg }))
      });
      return;
    }
    const results = await trigger.start({ ids: req.body?.pipelines ?? [] });
    res
      .status(results.some(r => r.status === 'error') ? 207 : 200)
      .json({
        pipelines: results.map(({ id, error, status, }) => ({
          id,
          status,
          message: error?.message,
        })),
      });
  });
  router.use(errorHandler());
  return router;
}
