import express from 'express';
import request from 'supertest';
import { PipelineTriggerError } from '../pipelines';
import { createRouter } from './router';
import { SearchClient } from 'algoliasearch';

const start = jest.fn();
const getPipelineIds = jest.fn();
const insightsClient = jest.fn();
const search = jest.fn();
const searchClient = { search } as unknown as SearchClient;

const createApp = async () => {
  const router = await createRouter({
    trigger: { start, getPipelineIds },
    clientFactory: {
      newInsightsClient: () => insightsClient,
      newSearchClient: () => searchClient,
    },
  });
  return express().use(router);
};

describe('createRouter', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
  });

  describe('GET /pipelines', () => {
    const endpoint = '/pipelines';
    let app: express.Express;

    beforeEach(async () => {
      app = await createApp();
    });

    it('returns object with empty list if no pipeline ids', async () => {
      getPipelineIds.mockResolvedValue([]);
      const response = await request(app).get(endpoint);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: [] });
    });

    it('returns object with ids', async () => {
      getPipelineIds.mockResolvedValue(['foo', 'bar', 'xyzzy']);
      const response = await request(app).get(endpoint);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: ['foo', 'bar', 'xyzzy'] });
    });
  });

  describe('POST /pipelines', () => {
    const endpoint = '/pipelines';
    let app: express.Express;

    beforeEach(async () => {
      app = await createApp();
    });

    it('returns no pipelines if no pipelines registered', async () => {
      start.mockResolvedValue([]);
      const response = await request(app)
        .post(endpoint)
        .send({ pipelines: ['plugh', 'baz'] });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: [] });
    });

    it('returns requested pipelines if pipelines registered', async () => {
      const results = [
        {
          id: 'plugh',
          status: 'ok',
        },
        {
          id: 'baz',
          status: 'ok',
        },
      ];
      start.mockResolvedValue(results);
      const response = await request(app)
        .post(endpoint)
        .send({ pipelines: ['plugh', 'baz'] });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: results });
    });

    it('trigger all pipelines and return all pipelines', async () => {
      const results = [
        {
          id: 'plugh',
          status: 'ok',
        },
        {
          id: 'baz',
          status: 'ok',
        },
        {
          id: 'fred',
          status: 'ok',
        },
        {
          id: 'bar',
          status: 'ok',
        },
      ];
      start.mockResolvedValue(results);
      const response = await request(app).post(endpoint);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: results });
    });

    it('trigger some pipelines and return pipelines with errors', async () => {
      const results = [
        {
          id: 'foo',
          status: 'error',
          error: new PipelineTriggerError('foo', 'bar'),
        },
        {
          id: 'xyzzy',
          status: 'error',
          error: new PipelineTriggerError('xyzzy', 'plugh'),
        },
        {
          id: 'fred',
          status: 'ok',
        },
      ];
      start.mockResolvedValue(results);
      const response = await request(app).post(endpoint);
      expect(response.status).toEqual(207);
      expect(response.body).toEqual({
        pipelines: [
          {
            id: 'foo',
            status: 'error',
            message: 'bar',
          },
          {
            id: 'xyzzy',
            status: 'error',
            message: 'plugh',
          },
          {
            id: 'fred',
            status: 'ok',
          },
        ],
      });
    });

    it('returns bad request if payload does not contain list', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({ pipelines: 'foo' });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if payload does not contain list of id strings', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({ pipelines: ['plugh', 123] });
      expect(response.status).toEqual(400);
    });
  });

  describe('POST /insights', () => {
    const endpoint = '/insights';
    let app: express.Express;

    beforeEach(async () => {
      app = await createApp();
    });

    it('proxies insights data to Algolia API', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({
          insightsMethod: 'foo',
          payload: { data: 'bar' },
          authenticatedUserToken: 'baz',
          userToken: 'qux',
        });
      expect(response.status).toEqual(202);
      expect(insightsClient).toHaveBeenCalledWith(
        'foo',
        expect.objectContaining({
          data: 'bar',
          authenticatedUserToken: 'baz',
          userToken: 'qux',
        }),
      );
    });

    it('returns bad request if insightsMethod is missing', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({
          payload: { data: 'bar' },
          authenticatedUserToken: 'baz',
          userToken: 'qux',
        });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if insightsMethod is not a string', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({
          insightsMethod: 123,
          payload: { data: 'bar' },
          authenticatedUserToken: 'baz',
          userToken: 'qux',
        });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if payload is missing', async () => {
      const response = await request(app).post(endpoint).send({
        insightsMethod: 'foo',
        authenticatedUserToken: 'baz',
        userToken: 'qux',
      });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if payload is not an object', async () => {
      const response = await request(app).post(endpoint).send({
        insightsMethod: 'foo',
        payload: 'bar',
        authenticatedUserToken: 'baz',
        userToken: 'qux',
      });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if payload is missing', async () => {
      const response = await request(app).post(endpoint).send({
        insightsMethod: 'foo',
        authenticatedUserToken: 'baz',
        userToken: 'qux',
      });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if userToken is missing', async () => {
      const response = await request(app).post(endpoint).send({
        insightsMethod: 'foo',
        payload: 'bar',
        authenticatedUserToken: 'baz',
      });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if userToken is not a string or number', async () => {
      const response = await request(app).post(endpoint).send({
        insightsMethod: 'foo',
        payload: 'bar',
        authenticatedUserToken: 'baz',
        userToken: true,
      });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if authenticatedUserToken is not a string or number', async () => {
      const response = await request(app).post(endpoint).send({
        insightsMethod: 'foo',
        payload: 'bar',
        authenticatedUserToken: true,
        userToken: 'qux',
      });
      expect(response.status).toEqual(400);
    });
  });

  describe('POST /query', () => {
    const endpoint = '/query';

    it('proxies search requests to Algolia API', async () => {
      search.mockResolvedValue({ results: ['bar'] });
      const app = await createApp();
      const response = await request(app)
        .post(endpoint)
        .send({
          requests: ['foo'],
        });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ results: ['bar'] });
      expect(search).toHaveBeenCalledWith(['foo']);
    });

    it('proxies search requests to Algolia API', async () => {
      const queryResultsHandler = jest
        .fn()
        .mockResolvedValue(['qux']);
      search.mockResolvedValue({ results: ['bar'] });
      const router = await createRouter({
        trigger: { start, getPipelineIds },
        clientFactory: {
          newInsightsClient: () => insightsClient,
          newSearchClient: () => searchClient,
        },
        queryResultsHandler,
      });
      const app = express().use(router);
      const response = await request(app)
        .post(endpoint)
        .send({
          requests: ['foo'],
          options: { plugh: 'xyzzy' },
        });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ results: ['qux'] });
      expect(queryResultsHandler).toHaveBeenCalledWith(['bar'], {
        plugh: 'xyzzy',
      });
      expect(search).toHaveBeenCalledWith(['foo']);
    });
  });
});
