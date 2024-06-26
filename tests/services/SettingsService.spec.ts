import { describe, assert, test, expect } from 'vitest';
import Client from '@/Client';
import { SettingsService } from '@/services/SettingsService';
import { respond } from '../setup';
import { http, HttpResponse } from 'msw';

describe('SettingsService', function () {
  const client = new Client('http://test.host');
  const service = new SettingsService(client);

  describe('getAll()', function () {
    test('Should fetch all app settings', async function () {
      respond(
        http.get('*/api/settings', () =>
          HttpResponse.json({
            test: 'abc',
          })
        )
      );
      const result = await service.getAll({
        q1: 123,
      });

      assert.deepEqual(result, { test: 'abc' });
    });
  });

  describe('update()', function () {
    test('Should send bulk app settings update', async function () {
      respond(
        http.patch('*/api/settings', () =>
          HttpResponse.json({
            test: 'abc',
          })
        )
      );
      const result = await service.update({ b1: 123 }, { headers: { 'x-test': '456' } });

      assert.deepEqual(result, { test: 'abc' });
    });
  });

  describe('testS3()', function () {
    test('Should send S3 connection test request', async function () {
      respond(
        http.post('*/api/settings/test/s3', async ({ request }) => {
          expect(await request.json()).toEqual({ filesystem: 'storage' });
          return HttpResponse.json({ status: 204 });
        })
      );

      const result = await service.testS3('storage', {
        q1: 123,
        headers: { 'x-test': '456' },
      });

      assert.isTrue(result);
    });
  });

  describe('testEmail()', function () {
    test('Should send a test email request', async function () {
      respond(
        http.post('*/api/settings/test/email', async ({ request }) => {
          expect(await request.json()).toEqual({
            template: 'abc',
            email: 'test@example.com',
          });
          return HttpResponse.json({ status: 204 });
        })
      );

      const result = await service.testEmail('test@example.com', 'abc', {
        q1: 123,
        headers: { 'x-test': '456' },
      });

      assert.isTrue(result);
    });
  });

  describe('generateAppleClientSecret()', function () {
    test('Should send an Apple OAuth2 client secret request', async function () {
      respond(
        http.post('*/api/settings/apple/generate-client-secret', async ({ request }) => {
          expect(await request.json()).toEqual({
            clientId: '1',
            teamId: '2',
            keyId: '3',
            privateKey: '4',
            duration: 5,
          });
          return HttpResponse.json({ secret: 'test' });
        })
      );

      const result = await service.generateAppleClientSecret('1', '2', '3', '4', 5, {
        q1: 123,
        headers: { 'x-test': '456' },
      });

      assert.deepEqual(result, { secret: 'test' });
    });
  });
});
