import { ClientResponseError } from '@/ClientResponseError';
import { BaseAuthStore } from '@/stores/BaseAuthStore';
import { LocalAuthStore } from '@/stores/LocalAuthStore';
import { SettingsService } from '@/services/SettingsService';
import { AdminService } from '@/services/AdminService';
import { RecordService } from '@/services/RecordService';
import { CollectionService } from '@/services/CollectionService';
import { LogService } from '@/services/LogService';
import { RealtimeService } from '@/services/RealtimeService';
import { HealthService } from '@/services/HealthService';
import { FileService } from '@/services/FileService';
import { BackupService } from '@/services/BackupService';
import { RecordModel } from '@/services/utils/dtos';
import { SendOptions, FileOptions, normalizeUnknownQueryParams } from '@/services/utils/options';
import { hasBlobField } from './formData';
import { serialize as convertToFormData } from 'object-to-formdata';

export interface BeforeSendResult extends Record<string, unknown> {
  url?: string;
  options?: Record<string, unknown>;
}

/**
 * PocketBase JS Client.
 */
export class Client {
  /**
   * The base PocketBase backend url address (eg. 'http://127.0.0.1.8090').
   */
  baseUrl: string;

  /**
   * Hook that get triggered right before sending the fetch request,
   * allowing you to inspect and modify the url and request options.
   *
   * For list of the possible options check https://developer.mozilla.org/en-US/docs/Web/API/fetch#options
   *
   * You can return a non-empty result object `{ url, options }` to replace the url and request options entirely.
   *
   * Example:
   * ```js
   * client.beforeSend = function (url, options) {
   *     options.headers = Object.assign({}, options.headers, {
   *         'X-Custom-Header': 'example',
   *     });
   *
   *     return { url, options }
   * };
   * ```
   */
  beforeSend?: (url: string, options: SendOptions) => BeforeSendResult | Promise<BeforeSendResult>;

  /**
   * Hook that get triggered after successfully sending the fetch request,
   * allowing you to inspect/modify the response object and its parsed data.
   *
   * Returns the new Promise resolved `data` that will be returned to the client.
   *
   * Example:
   * ```js
   * client.afterSend = function (response, data) {
   *     if (response.status != 200) {
   *         throw new ClientResponseError({
   *             url:      response.url,
   *             status:   response.status,
   *             response: { ... },
   *         });
   *     }
   *
   *     return data;
   * };
   * ```
   */
  afterSend?: <T = unknown>(response: Response, data: T) => T | PromiseLike<T>;

  /**
   * Optional language code (default to `en-US`) that will be sent
   * with the requests to the server as `Accept-Language` header.
   */
  lang: string;

  /**
   * A replaceable instance of the local auth store service.
   */
  authStore: BaseAuthStore;

  /**
   * An instance of the service that handles the **Settings APIs**.
   */
  readonly settings: SettingsService;

  /**
   * An instance of the service that handles the **Admin APIs**.
   */
  readonly admins: AdminService;

  /**
   * An instance of the service that handles the **Collection APIs**.
   */
  readonly collections: CollectionService;

  /**
   * An instance of the service that handles the **File APIs**.
   */
  readonly files: FileService;

  /**
   * An instance of the service that handles the **Log APIs**.
   */
  readonly logs: LogService;

  /**
   * An instance of the service that handles the **Realtime APIs**.
   */
  readonly realtime: RealtimeService;

  /**
   * An instance of the service that handles the **Health APIs**.
   */
  readonly health: HealthService;

  /**
   * An instance of the service that handles the **Backup APIs**.
   */
  readonly backups: BackupService;

  private cancelControllers: Map<string, AbortController> = new Map<string, AbortController>();
  private recordServices: Map<string, RecordService> = new Map<string, RecordService>();
  private enableAutoCancellation = true;

  constructor(baseUrl = '/', authStore?: BaseAuthStore | null, lang = 'en-US') {
    this.baseUrl = baseUrl;
    this.lang = lang;
    this.authStore = authStore || new LocalAuthStore();

    // services
    this.admins = new AdminService(this);
    this.collections = new CollectionService(this);
    this.files = new FileService(this);
    this.logs = new LogService(this);
    this.settings = new SettingsService(this);
    this.realtime = new RealtimeService(this);
    this.health = new HealthService(this);
    this.backups = new BackupService(this);
  }

  /**
   * Returns the RecordService associated to the specified collection.
   *
   * @param  {string} idOrName
   * @return {RecordService}
   */
  collection<M extends RecordModel = RecordModel>(idOrName: string): RecordService<M> {
    const service = (this.recordServices.get(idOrName) as RecordService<M>) ?? new RecordService<M>(this, idOrName);
    this.recordServices.set(idOrName, service);

    return service;
  }

  /**
   * Globally enable or disable auto cancellation for pending duplicated requests.
   */
  autoCancellation(enable: boolean): Client {
    this.enableAutoCancellation = !!enable;

    return this;
  }

  /**
   * Cancels single request by its cancellation key.
   */
  cancelRequest(requestKey: string): Client {
    const controller = this.cancelControllers.get(requestKey);
    if (controller) {
      controller.abort();
      this.cancelControllers.delete(requestKey);
    }

    return this;
  }

  /**
   * Cancels all pending requests.
   */
  cancelAllRequests(): Client {
    this.cancelControllers.forEach(controller => controller.abort());
    this.cancelControllers.clear();

    return this;
  }

  /**
   * Constructs a filter expression with placeholders populated from a parameters object.
   *
   * Placeholder parameters are defined with the `{:paramName}` notation.
   *
   * The following parameter values are supported:
   *
   * - `string` (_single quotes are autoescaped_)
   * - `number`
   * - `boolean`
   * - `Date` object (_stringified into the PocketBase datetime format_)
   * - `null`
   * - everything else is converted to a string using `JSON.stringify()`
   *
   * Example:
   *
   * ```js
   * pb.collection("example").getFirstListItem(pb.filter(
   *    'title ~ {:title} && created >= {:created}',
   *    { title: "example", created: new Date()}
   * ))
   * ```
   */
  filter(raw: string, params?: Record<string, unknown>): string {
    if (!params) {
      return raw;
    }

    for (const key in params) {
      let val = params[key];
      switch (typeof val) {
        case 'boolean':
        case 'number':
          val = '' + val;
          break;
        case 'string':
          val = "'" + val.replace(/'/g, "\\'") + "'";
          break;
        default:
          if (val === null) {
            val = 'null';
          } else if (val instanceof Date) {
            val = "'" + val.toISOString().replace('T', ' ') + "'";
          } else {
            val = "'" + JSON.stringify(val).replace(/'/g, "\\'") + "'";
          }
      }
      if (typeof val === 'string') raw = raw.replaceAll('{:' + key + '}', val);
    }

    return raw;
  }

  /**
   * Legacy alias of `pb.files.getUrl()`.
   */
  getFileUrl(record: RecordModel, filename: string, queryParams: FileOptions = {}): string {
    return this.files.getUrl(record, filename, queryParams);
  }

  /**
   * Builds a full client url by safely concatenating the provided path.
   */
  buildUrl(path: string): string {
    return new URL(path, this.baseUrl).toString();
  }

  /**
   * Sends an api http request.
   *
   * @throws {ClientResponseError}
   */
  async send<T = unknown>(path: string, options: SendOptions): Promise<T> {
    options = this.initSendOptions(path, options);

    // build url + path
    let url = this.buildUrl(path);

    if (this.beforeSend) {
      const result = await this.beforeSend(url, options);
      url = result.url ?? url;
      options = result.options ?? options;
    }

    // serialize the query parameters
    if (typeof options.query !== 'undefined') {
      const query = this.serializeQueryParams(options.query);
      if (query) {
        url += (url.includes('?') ? '&' : '?') + query;
      }
      delete options.query;
    }

    const fetchFunc = options.fetch ?? fetch;

    const response = await fetchFunc(url, options);
    if (response.status === 204) return {} as T;

    const data = await response.json();

    if (response.status >= 400) {
      throw new ClientResponseError({
        url: response.url ?? url ?? '<unknown url>',
        status: response.status,
        data,
      });
    }

    return this.afterSend ? await this.afterSend(response, data) : (data as T);
  }

  /**
   * Shallow copy the provided object and takes care to initialize
   * any options required to preserve the backward compatability.
   *
   * @param  {SendOptions} options
   * @return {SendOptions}
   */
  private initSendOptions(path: string, options: SendOptions): SendOptions {
    options = Object.assign({ method: 'GET' } as SendOptions, options);

    // move unknown send options as query parameters
    normalizeUnknownQueryParams(options);

    // requestKey normalizations for backward-compatibility
    // ---
    options.query = Object.assign({}, options.params, options.query);
    if (typeof options.requestKey === 'undefined') {
      if (options.$autoCancel === false || options.query.$autoCancel === false) {
        options.requestKey = null;
      } else if (options.query.$cancelKey && typeof options.query.$cancelKey === 'string') {
        options.requestKey = options.query.$cancelKey;
      }
    }
    // remove the deprecated special cancellation params from the other query params
    delete options.$autoCancel;
    delete options.query.$autoCancel;
    delete options.$cancelKey;
    delete options.query.$cancelKey;
    // ---

    // add the json header, if not explicitly set
    // (for FormData body the Content-Type header should be skipped since the boundary is autogenerated)
    if (this.getHeader(options.headers, 'Content-Type') === null && !this.isFormData(options.body)) {
      options.headers = Object.assign({}, options.headers, {
        'Content-Type': 'application/json',
      });
    }

    // add Accept-Language header, if not explicitly set
    if (this.getHeader(options.headers, 'Accept-Language') === null) {
      options.headers = Object.assign({}, options.headers, {
        'Accept-Language': this.lang,
      });
    }

    // check if Authorization header can be added
    if (
      // has valid token
      this.authStore.token &&
      // auth header is not explicitly set
      this.getHeader(options.headers, 'Authorization') === null
    ) {
      options.headers = Object.assign({}, options.headers, {
        Authorization: this.authStore.token,
      });
    }

    // handle auto cancelation for duplicated pending request
    if (this.enableAutoCancellation && options.requestKey !== null) {
      const requestKey = options.requestKey || (options.method || 'GET') + path;

      delete options.requestKey;

      // cancel previous pending requests
      this.cancelRequest(requestKey);

      const controller = new AbortController();
      this.cancelControllers.set(requestKey, controller);
      options.signal = controller.signal;
    }

    return options;
  }

  /**
   * Converts analyzes the provided body and converts it to FormData
   * in case a plain object with File/Blob values is used.
   */
  convertToFormDataIfNeeded<T extends BodyInit>(body: T): FormData | T {
    if (this.isFormData(body)) return body;
    if (!hasBlobField(body)) return body;

    return convertToFormData(body);
  }

  /**
   * Extracts the header with the provided name in case-insensitive manner.
   * Returns `null` if no header matching the name is found.
   */
  private getHeader(headers: Record<string, string> | undefined, name: string): string | null {
    headers = headers || {};
    name = name.toLowerCase();

    for (const key in headers) {
      if (key.toLowerCase() == name) {
        return headers[key];
      }
    }

    return null;
  }

  /**
   * Loosely checks if the specified body is a FormData instance.
   */
  private isFormData(body: unknown): body is FormData {
    return (
      !!body &&
      // we are checking the constructor name because FormData
      // is not available natively in some environments and the
      // polyfill(s) may not be globally accessible
      (body.constructor.name === 'FormData' ||
        // fallback to global FormData instance check
        // note: this is needed because the constructor.name could be different in case of
        //       custom global FormData implementation, eg. React Native on Android/iOS
        (typeof FormData !== 'undefined' && body instanceof FormData))
    );
  }

  /**
   * Serializes the provided query parameters into a query string.
   */
  private serializeQueryParams(params: Record<string, unknown>): string {
    const result: string[] = [];
    for (const key in params) {
      if (params[key] === null) {
        // skip null query params
        continue;
      }

      const value = params[key];
      const encodedKey = encodeURIComponent(key);

      if (Array.isArray(value)) {
        // repeat array params
        for (const v of value) {
          result.push(encodedKey + '=' + encodeURIComponent(v));
        }
      } else if (value instanceof Date) {
        result.push(encodedKey + '=' + encodeURIComponent(value.toISOString()));
      } else if (value && typeof value === 'object') {
        result.push(encodedKey + '=' + encodeURIComponent(JSON.stringify(value)));
      } else if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        result.push(encodedKey + '=' + encodeURIComponent(value));
      }
    }

    return result.join('&');
  }
}

export default Client;
