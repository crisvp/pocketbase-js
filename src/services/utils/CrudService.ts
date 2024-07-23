import { BaseService } from '@/services/utils/BaseService';
import { ClientResponseError } from '@/ClientResponseError';
import { ListResult, RecordModel } from '@/services/utils/dtos';
import { CommonOptions, ListOptions, FullListOptions } from '@/services/utils/options';

export abstract class CrudService<M extends RecordModel> extends BaseService {
  /**
   * Base path for the crud actions (without trailing slash, eg. '/admins').
   */
  abstract get baseCrudPath(): string;

  /**
   * Response data decoder.
   */
  decode<T>(data: T): T {
    return data;
  }

  /**
   * Returns a promise with all list items batch fetched at once
   * (by default 500 items per request; to change it set the `batch` query param).
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * @throws {ClientResponseError}
   */
  async getFullList(batchOrqueryParams?: number | FullListOptions, options?: FullListOptions): Promise<M[]> {
    if (typeof batchOrqueryParams == 'number') {
      return this._getFullList(batchOrqueryParams, options);
    }

    options = Object.assign({}, batchOrqueryParams, options);

    let batch = 500;
    if (options.batch) {
      batch = options.batch;
      delete options.batch;
    }

    return this._getFullList(batch, options);
  }

  /**
   * Returns paginated items list.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * @throws {ClientResponseError}
   */
  async getList(page = 1, perPage = 30, options?: ListOptions): Promise<ListResult<M>> {
    options = Object.assign(
      {
        method: 'GET',
      },
      options
    );

    options.query = Object.assign(
      {
        page: page,
        perPage: perPage,
      },
      options.query
    );

    const responseData = await this.client.send<ListResult<M>>(this.baseCrudPath, options);
    return responseData;
  }

  /**
   * Returns the first found item by the specified filter.
   *
   * Internally it calls `getList(1, 1, { filter, skipTotal })` and
   * returns the first found item.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * For consistency with `getOne`, this method will throw a 404
   * ClientResponseError if no item was found.
   *
   * @throws {ClientResponseError}
   */
  async getFirstListItem(filter: string, options?: CommonOptions): Promise<M> {
    options = Object.assign(
      {
        requestKey: 'one_by_filter_' + this.baseCrudPath + '_' + filter,
      },
      options
    );

    options.query = Object.assign(
      {
        filter: filter,
        skipTotal: 1,
      },
      options.query
    );

    const result = await this.getList(1, 1, options);

    if (!result?.items?.length) {
      throw new ClientResponseError({
        status: 404,
        response: {
          code: 404,
          message: "The requested resource was not found.",
          data: {},
        },
      });
    }

    return result.items[0];
  }

  /**
     * Returns single item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * If `id` is empty it will throw a 404 error.
     *
     M @throws {ClientResponseError}
     */
  async getOne(id: string, options?: CommonOptions): Promise<M> {
    if (!id) {
      throw new ClientResponseError({
        url: this.client.buildUrl(this.baseCrudPath + '/'),
        status: 404,
        response: {
          code: 404,
          message: 'Missing required record id.',
          data: {},
        },
      });
    }

    options = Object.assign(
      {
        method: 'GET',
      },
      options
    );

    return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(id), options);
  }

  /**
   * Creates a new item.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * @throws {ClientResponseError}
   */
  async create(bodyParams?: Record<string, unknown> | FormData, options?: CommonOptions): Promise<M> {
    options = Object.assign(
      {
        method: 'POST',
        body: bodyParams,
      },
      options
    );

    return this.client.send(this.baseCrudPath, options);
  }

  /**
   * Updates an existing item by its id.
   *
   * You can use the generic T to supply a wrapper type of the crud model.
   *
   * @throws {ClientResponseError}
   */
  async update(id: string, bodyParams?: Record<string, unknown> | FormData, options?: CommonOptions): Promise<M> {
    options = Object.assign(
      {
        method: 'PATCH',
        body: JSON.stringify(bodyParams),
      },
      options
    );

    return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(id), options);
  }

  /**
   * Deletes an existing item by its id.
   *
   * @throws {ClientResponseError}
   */
  async delete(id: string, options?: CommonOptions): Promise<boolean> {
    options = Object.assign(
      {
        method: 'DELETE',
      },
      options
    );

    return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(id), options).then(() => true);
  }

  /**
   * Returns a promise with all list items batch fetched at once.
   */
  protected _getFullList(batchSize = 500, options?: ListOptions): Promise<M[]> {
    options = options || {};
    options.query = Object.assign(
      {
        skipTotal: 1,
      },
      options.query
    );

    let result: M[] = [];

    const request = async (page: number): Promise<M[]> => {
      const list = await this.getList(page, batchSize || 500, options);
      const items = list.items;

      result = result.concat(items);

      if (items.length == list.perPage) return request(page + 1);

      return result;
    };

    return request(1);
  }
}
