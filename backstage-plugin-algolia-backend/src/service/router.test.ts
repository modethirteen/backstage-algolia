import { getVoidLogger } from '@backstage/backend-common';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { PipelineTriggerError } from '../pipelines';

const start = jest.fn();

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
      trigger: { start },
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /index', () => {
    it('can handle successful reindexing', async () => {
      start.mockResolvedValue([]);
      const response = await request(app).post('/index');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    });
    it('can handle reindexing with errors', async () => {
      start.mockResolvedValue([
        new PipelineTriggerError('foo', 'bar'),
        new PipelineTriggerError('xyzzy', 'plugh'),
      ]);
      const response = await request(app).post('/index');
      expect(response.status).toEqual(207);
      expect(response.body).toEqual([{
        id: 'foo',
        message: 'bar',
      }, {
        id: 'xyzzy',
        message: 'plugh',
      }]);
    });
  });
});
