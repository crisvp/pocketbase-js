import { describe, assert, test } from 'vitest';
import Client from '@/Client';
import { HealthService } from '@/services/HealthService';
import { http, HttpResponse } from 'msw';
import { respond } from '../setup';

describe('HealthService', function () {
  const client = new Client('http://test.host/');
  const service = new HealthService(client);

  describe('check()', function () {
    test('Should fetch all app settings', async function () {
      respond(http.get('*/api/health', () => HttpResponse.json({ code: 200, message: 'test', data: {} })));

      const result = await service.check({
        q1: 123,
        headers: { 'x-test': '456' },
      });

      assert.deepEqual(result, { code: 200, message: 'test', data: {} });
    });
  });
});
