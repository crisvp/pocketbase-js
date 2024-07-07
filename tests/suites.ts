import { describe, assert, expect, test } from 'vitest';
import { CrudService } from '@/services/utils/CrudService';
import { RecordModel } from '@/services/utils/dtos';

export function crudServiceTestsSuite<M extends RecordModel>(service: CrudService<M>, expectedBasePath: string) {
  const id = 'abc=';

  describe('CrudServiceTests', function () {
    describe('baseCrudPath()', function () {
      test('Should corectly return the service base crud path', function () {
        assert.equal(service.baseCrudPath, expectedBasePath);
      });
    });

    describe('getFullList()', function () {
      test('items.length == batchSize (aka. empty request stop check)', async function () {
        const result = await service.getFullList({
          batch: 1,
          q1: 'emptyRequest',
          headers: { 'x-test': '789' },
        });
        const expected = [service.decode({ id: 'item1' }), service.decode({ id: 'item2' })];

        assert.deepEqual(result, expected);
      });
      test('items.length < batchSize (aka. no empty request stop check)', async function () {
        const result = await service.getFullList({
          batch: 2,
          q1: 'noEmptyRequest',
          headers: { 'x-test': '789' },
        });
        const expected = [
          service.decode({ id: 'item1' }),
          service.decode({ id: 'item2' }),
          service.decode({ id: 'item3' }),
        ];

        assert.deepEqual(result, expected);
      });
    });

    describe('getList()', function () {
      test('Should correctly return paginated list result', async function () {
        const list = await service.getList(2, 1, {
          q1: 'abc',
          headers: { 'x-test': '789' },
        });
        const expected = [service.decode({ id: 'item3' })];

        assert.deepEqual(list, {
          page: 2,
          perPage: 1,
          totalItems: 3,
          totalPages: 3,
          items: expected,
        });
      });
    });

    describe('getFirstListItem()', function () {
      test('Should return single model item by a filter', async function () {
        const result = await service.getFirstListItem('test=123', {
          q1: 'abc',
          headers: { 'x-test': '789' },
        });
        const expected = service.decode({ id: 'item1' });

        assert.deepEqual(result, expected);
      });
    });

    describe('getOne()', function () {
      test('Should return single model item by an id', async function () {
        const result = await service.getOne(id, {
          q1: 'abc',
          headers: { 'x-test': '789' },
        });
        const expected = service.decode({ id: 'item-one' });

        assert.deepEqual(result, expected);
      });

      test('Should return a 404 error if id is empty', async function () {
        const options = { q1: 'abc', headers: { 'x-test': '789' } };

        expect(service.getOne('', options)).rejects.toThrow('Missing required record id.');
        // @ts-expect-error - Testing invalid input
        expect(service.getOne(null, options)).rejects.toThrow('Missing required record id.');
        // @ts-expect-error - Testing invalid input
        expect(service.getOne(undefined, options)).rejects.toThrow('Missing required record id.');
      });
    });

    describe('create()', function () {
      test('Should create new model item', async function () {
        const result = await service.create({ b1: 123 }, { q1: 456, headers: { 'x-test': '789' } });
        const expected = service.decode({ id: 'item-create' });

        assert.deepEqual(result, expected);
      });
    });

    describe('update()', function () {
      test('Should update existing model item', async function () {
        const result = await service.update(id, { b1: 123 }, { q1: 456, headers: { 'x-test': '789' } });
        const expected = service.decode({ id: 'item-update' });

        assert.deepEqual(result, expected);
      });
    });

    describe('delete()', function () {
      test('Should delete single model item', async function () {
        const result = await service.delete(id, {
          q1: 456,
          headers: { 'x-test': '789' },
        });

        assert.isTrue(result);
      });
    });
  });
}
