import express from 'express';
import Router from 'express-promise-router';
import { InsightsMethodMap } from 'search-insights';
import { ClientFactoryInterface } from 'backstage-plugin-algolia-node/src/api/ClientFactory';
import { validateData } from './validationMiddleware';
import {
  IndexObjectWithIdAndTimestamp,
  InsightsProxyRequest,
  insightsProxyRequestSchema,
  SearchProxyRequest,
  searchProxyRequestSchema,
} from 'backstage-plugin-algolia-common';
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import {
  SearchForFacetValuesResponse,
  SearchResponse,
} from '@algolia/client-search';
import { z } from 'zod';
import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import { PipelineTriggerInterface } from 'backstage-plugin-algolia-node';

const pipelinesRequestSchema = z.object({
  pipelines: z.array(z.string()).optional(),
});

export interface RouterOptions {
  clientFactory: ClientFactoryInterface;
  config: Config;
  logger: LoggerService;
  trigger: PipelineTriggerInterface;
  queryResultsHandler?: (
    results: (
      | SearchForFacetValuesResponse
      | SearchResponse<IndexObjectWithIdAndTimestamp>
    )[],
    options?: SearchProxyRequest['options'],
  ) => Promise<
    (
      | SearchForFacetValuesResponse
      | SearchResponse<IndexObjectWithIdAndTimestamp>
    )[]
  >;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { clientFactory, config, logger, trigger, queryResultsHandler } =
    options;
  const router = Router();
  router.use(express.json());

  router.get('/pipelines', async (_, res) => {
    res.status(200).json({ pipelines: await trigger.getPipelineIds() });
  });

  router.post(
    '/pipelines',
    validateData(pipelinesRequestSchema),
    async (req, res) => {
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
    validateData(insightsProxyRequestSchema),
    async (req, res) => {
      const {
        insightsMethod,
        payload,
        authenticatedUserToken,
        userToken,
      }: InsightsProxyRequest = req.body;
      const insights = clientFactory.newInsightsClient();
      insights(insightsMethod as keyof InsightsMethodMap, {
        ...payload,
        authenticatedUserToken,
        userToken,
      });
      res.status(202).json({
        message: `Dispatched ${insightsMethod} payload to Algolia Insights API`,
      });
    },
  );

  router.post(
    '/query',
    validateData(searchProxyRequestSchema),
    async (req, res) => {
      const { requests, options }: SearchProxyRequest = req.body;
      const client = clientFactory.newSearchClient();
      const response = await client.search(requests);
      res.json(
        queryResultsHandler
          ? {
              ...response,
              results: await queryResultsHandler(
                response.results as (
                  | SearchForFacetValuesResponse
                  | SearchResponse<IndexObjectWithIdAndTimestamp>
                )[],
                options,
              ),
            }
          : response,
      );
    },
  );

  const middleware = MiddlewareFactory.create({ logger, config });
  router.use(middleware.error());
  return router;
}
