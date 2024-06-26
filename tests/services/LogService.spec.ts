import { describe, assert, expect, test, beforeAll, afterAll, afterEach } from 'vitest';
import Client from '@/Client';
import { LogService } from '@/services/LogService';
import { respond } from '../setup';
import { http, HttpResponse } from 'msw';

describe('LogService', function () {
  const client = new Client('http://test.host');
  const service = new LogService(client);

  describe('getList()', function () {
    test('Should correctly return paginated list result', async function () {
      const replyBody = {
        page: 2,
        perPage: 1,
        totalItems: 3,
        totalPages: 3,
        items: [{ id: 'test123' }],
      };
      respond(http.get('*/api/logs?page=2&perPage=1&q1=abc', () => HttpResponse.json(replyBody)));

      const list = await service.getList(2, 1, {
        q1: 'abc',
        headers: { 'x-test': '456' },
      });

      assert.deepEqual(list, replyBody);
    });
  });

  describe('getOne()', function () {
    test('Should return single log', async function () {
      respond(http.get('*/api/logs/test%3F123', () => HttpResponse.json({ id: 'test?123' })));
      const result = await service.getOne('test?123', {
        q1: 'abc',
        headers: { 'x-test': '456' },
      });

      expect(result).toEqual({ id: 'test?123' });
    });

    test('Should return a 404 error if id is empty', async function () {
      expect(service.getOne('')).rejects.toThrow('Missing required log id.');
      // @ts-expect-error - Testing invalid input
      expect(service.getOne(null)).rejects.toThrow('Missing required log id.');
      // @ts-expect-error - Testing invalid input
      expect(service.getOne(undefined)).rejects.toThrow('Missing required log id.');
    });
  });

  describe('getStats()', function () {
    test('Should return array with date grouped logs', async function () {
      respond(http.get('*/api/logs/stats', () => HttpResponse.json([{ total: 123, date: '2022-01-01 00:00:00' }])));
      const result = await service.getStats({
        q1: 'abc',
        headers: { 'x-test': '456' },
      });
      const expected = [{ total: 123, date: '2022-01-01 00:00:00' }];

      assert.deepEqual(result, expected);
    });
  });
});
