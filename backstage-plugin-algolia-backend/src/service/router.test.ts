import express from 'express';
import request from 'supertest';
import { PipelineTriggerError } from '../pipelines';
import { createRouter } from './router';

const start = jest.fn();
const getPipelineIds = jest.fn();

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter({
      trigger: { start, getPipelineIds },
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /', () => {
    it('returns object with empty list if no pipeline ids', async () => {
      getPipelineIds.mockResolvedValue([]);
      const response = await request(app).get('/');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: [] });
    });

    it('returns object with ids', async () => {
      getPipelineIds.mockResolvedValue(['foo', 'bar', 'xyzzy']);
      const response = await request(app).get('/');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: ['foo', 'bar', 'xyzzy'] });     
    })
  });

  describe('POST /', () => {
    it('returns no pipelines if no pipelines registered', async () => {
      start.mockResolvedValue([]);
      const response = await request(app)
        .post('/')
        .send({ pipelines: ['plugh', 'baz'] });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: [] });
    });

    it('returns requested pipelines if pipelines registered', async () => {
      const results = [{
        id: 'plugh',
        status: 'ok',
      }, {
        id: 'baz',
        status: 'ok',       
      }];
      start.mockResolvedValue(results);
      const response = await request(app)
        .post('/')
        .send({ pipelines: ['plugh', 'baz'] });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: results });
    });

    it('trigger all pipelines and return all pipelines', async () => {
      const results = [{
        id: 'plugh',
        status: 'ok',
      }, {
        id: 'baz',
        status: 'ok',
      }, {
        id: 'fred',
        status: 'ok',
      }, {
        id: 'bar',
        status: 'ok',
      }];
      start.mockResolvedValue(results);
      const response = await request(app).post('/');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ pipelines: results });
    });

    it('trigger some pipelines and return pipelines with errors', async () => {
      const results = [{
        id: 'foo',
        status: 'error',
        error: new PipelineTriggerError('foo', 'bar'),
      }, {
        id: 'xyzzy',
        status: 'error',
        error: new PipelineTriggerError('xyzzy', 'plugh'),
      }, {
        id: 'fred',
        status: 'ok',
      }];
      start.mockResolvedValue(results);
      const response = await request(app).post('/');
      expect(response.status).toEqual(207);
      expect(response.body).toEqual({ pipelines: [{
        id: 'foo',
        status: 'error',
        message: 'bar',
      }, {
        id: 'xyzzy',
        status: 'error',
        message: 'plugh',
      }, {
        id: 'fred',
        status: 'ok',
      }]});
    });

    it('returns bad request if payload does not contain list', async () => {
      const response = await request(app)
        .post('/')
        .send({ pipelines: 'foo' });
      expect(response.status).toEqual(400);
    });

    it('returns bad request if payload does not contain list of id strings', async () => {
      const response = await request(app)
        .post('/')
        .send({ pipelines: ['plugh', 123] });
      expect(response.status).toEqual(400);
    });
  });
});
