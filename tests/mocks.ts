import { ClientResponseError } from '@/ClientResponseError';

export interface RequestMock {
  method?: string;
  url?: string;
  body?: Record<string, unknown>;
  additionalMatcher?: (url: RequestInfo | URL, config: RequestInit | Record<string, unknown> | undefined) => boolean;
  delay?: number;
  replyCode?: number;
  replyBody?: unknown;
}

export function dummyJWT(payload = {}) {
  const buf = Buffer.from(JSON.stringify(payload));
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + buf.toString('base64') + '.test';
}

export class FetchMock {
  private originalFetch?: typeof fetch;
  private mocks: RequestMock[] = [];

  on(request: RequestMock) {
    this.mocks.push(request);
  }

  /**
   * Initializes the mock by temporary overwriting `global.fetch`.
   */
  init() {
    this.originalFetch = global?.fetch;

    global.fetch = (url: RequestInfo | URL, config?: RequestInit) => {
      for (const mock of this.mocks) {
        // match url and method
        if (mock.url !== url || config?.method !== mock.method) {
          continue;
        }

        // match body params
        if (mock.body) {
          let configBody: Record<string, unknown> = {};

          // deserialize
          if (typeof config?.body === 'string') {
            configBody = JSON.parse(config?.body) as Record<string, unknown>;
          }

          let hasMissingBodyParam = false;
          for (const key in mock.body) {
            if (
              typeof configBody[key] === 'undefined' ||
              JSON.stringify(configBody[key]) != JSON.stringify(mock.body[key])
            ) {
              hasMissingBodyParam = true;
              break;
            }
          }
          if (hasMissingBodyParam) {
            continue;
          }
        }

        if (mock.additionalMatcher && !mock.additionalMatcher(url, config)) {
          continue;
        }

        const response = {
          url: url,
          status: mock.replyCode,
          statusText: 'test',
          json: async () => mock.replyBody || {},
        } as Response;

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (config?.signal?.aborted) {
              reject(new ClientResponseError());
            }
            resolve(response);
          }, mock.delay || 0);
        });
      }

      throw new Error('Request not mocked: ' + url);
    };
  }

  /**
   * Restore the original node fetch function.
   */
  restore() {
    (global.fetch as unknown) = this.originalFetch;
  }

  /**
   * Clears all registered mocks.
   */
  clearMocks() {
    this.mocks = [];
  }
}
