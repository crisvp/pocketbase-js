import { describe, assert, test, expect } from 'vitest';
import Client from '@/Client';
import { CollectionService } from '@/services/CollectionService';
import { CollectionModel } from '@/services/utils/dtos';
import { respond } from '../setup';
import { http, HttpResponse } from 'msw';

describe('CollectionService', function () {
  const client = new Client('http://test.host');
  const service = new CollectionService(client);

  describe('import()', function () {
    test('Should send a bulk import collections request', async function () {
      let inputValidationError;
      respond(
        http.put('*/api/collections/import', async ({ request }) => {
          try {
            expect(await request.json()).toEqual({
              collections: [{ id: 'id1' }, { id: 'id2' }],
              deleteMissing: true,
            });
          } catch (e) {
            inputValidationError = e;
          }
          return HttpResponse.json({ status: 204 });
        })
      );
      // fetchMock.on({
      //     method: "PUT",
      //     url: service.client.buildUrl("/api/collections/import?q1=456"),
      //     body: {
      //         collections: [{ id: "id1" }, { id: "id2" }],
      //         deleteMissing: true,
      //     },
      //     additionalMatcher: (_, config) => {
      //         return config?.headers?.["x-test"] === "123";
      //     },
      //     replyCode: 204,
      //     replyBody: true,
      // });

      const result = await service.import([{ id: 'id1' }, { id: 'id2' }] as CollectionModel[], true, {
        q1: 456,
        headers: { 'x-test': '123' },
      });

      if (inputValidationError) throw inputValidationError;
      assert.deepEqual(result, true);
    });
  });
});
