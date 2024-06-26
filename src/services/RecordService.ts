import Client from '@/Client';
import { getTokenPayload, jwtValid } from '@/stores/utils/jwt';
import { CrudService } from '@/services/utils/CrudService';
import { RealtimeService, UnsubscribeFunc } from '@/services/RealtimeService';
import { ClientResponseError } from '@/ClientResponseError';
import { ListResult, RecordModel, ExternalAuthModel } from '@/services/utils/dtos';
import {
  SendOptions,
  CommonOptions,
  RecordOptions,
  RecordListOptions,
  RecordFullListOptions,
} from '@/services/utils/options';
import { AuthModel } from '@/stores/BaseAuthStore';

export interface RecordAuthResponse<T = RecordModel> {
  /**
   * The signed PocketBase auth record.
   */
  record: T;

  /**
   * The PocketBase record auth token.
   *
   * If you are looking for the OAuth2 access and refresh tokens
   * they are available under the `meta.accessToken` and `meta.refreshToken` props.
   */
  token: string;

  /**
   * Auth meta data usually filled when OAuth2 is used.
   */
  meta?: Record<string, unknown>;
}

export interface AuthProviderInfo {
  name: string;
  displayName: string;
  state: string;
  authUrl: string;
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export interface AuthMethodsList {
  usernamePassword: boolean;
  emailPassword: boolean;
  onlyVerified: boolean;
  authProviders: AuthProviderInfo[];
}

export interface RecordSubscription<T = RecordModel> {
  action: string; // eg. create, update, delete
  record: T;
}

export type OAuth2UrlCallback = (url: string) => void | Promise<void>;

export interface OAuth2AuthConfig extends SendOptions {
  // the name of the OAuth2 provider (eg. "google")
  provider: string;

  // custom scopes to overwrite the default ones
  scopes?: string[];

  // optional record create data
  createData?: Record<string, unknown>;

  // optional callback that is triggered after the OAuth2 sign-in/sign-up url generation
  urlCallback?: OAuth2UrlCallback;

  // optional query params to send with the PocketBase auth request (eg. fields, expand, etc.)
  query?: RecordOptions;
}

export class RecordService<M extends RecordModel = RecordModel> extends CrudService<M> {
  readonly collectionIdOrName: string;

  constructor(client: Client, collectionIdOrName: string) {
    super(client);

    this.collectionIdOrName = collectionIdOrName;
  }

  /**
   * @inheritdoc
   */
  get baseCrudPath(): string {
    return this.baseCollectionPath + '/records';
  }

  /**
   * Returns the current collection service base path.
   */
  get baseCollectionPath(): string {
    return '/api/collections/' + encodeURIComponent(this.collectionIdOrName);
  }

  // ---------------------------------------------------------------
  // Realtime handlers
  // ---------------------------------------------------------------

  /**
   * Subscribe to realtime changes to the specified topic ("*" or record id).
   *
   * If `topic` is the wildcard "*", then this method will subscribe to
   * any record changes in the collection.
   *
   * If `topic` is a record id, then this method will subscribe only
   * to changes of the specified record id.
   *
   * It's OK to subscribe multiple times to the same topic.
   * You can use the returned `UnsubscribeFunc` to remove only a single subscription.
   * Or use `unsubscribe(topic)` if you want to remove all subscriptions attached to the topic.
   */
  async subscribe(
    topic: string,
    callback: (data: RecordSubscription<M>) => void,
    options?: SendOptions
  ): Promise<UnsubscribeFunc> {
    if (!topic) {
      throw new Error('Missing topic.');
    }

    if (!callback) {
      throw new Error('Missing subscription callback.');
    }

    return this.client.realtime.subscribe(this.collectionIdOrName + '/' + topic, callback, options);
  }

  /**
   * Unsubscribe from all subscriptions of the specified topic
   * ("*" or record id).
   *
   * If `topic` is not set, then this method will unsubscribe from
   * all subscriptions associated to the current collection.
   */
  async unsubscribe(topic?: string): Promise<void> {
    // unsubscribe from the specified topic
    if (topic) {
      return this.client.realtime.unsubscribe(this.collectionIdOrName + '/' + topic);
    }

    // unsubscribe from everything related to the collection
    return this.client.realtime.unsubscribeByPrefix(this.collectionIdOrName);
  }

  // ---------------------------------------------------------------
  // Crud handers
  // ---------------------------------------------------------------
  async getFullList(batchOrOptions?: number | RecordFullListOptions, options?: RecordListOptions): Promise<M[]> {
    if (typeof batchOrOptions == 'number') {
      return super.getFullList(batchOrOptions, options);
    }

    const params = Object.assign({}, batchOrOptions, options);

    return super.getFullList(params);
  }

  /**
   * @inheritdoc
   */
  async getList(page = 1, perPage = 30, options?: RecordListOptions): Promise<ListResult<M>> {
    return super.getList(page, perPage, options);
  }

  /**
   * @inheritdoc
   */
  async getFirstListItem(filter: string, options?: RecordListOptions): Promise<M> {
    return super.getFirstListItem(filter, options);
  }

  /**
   * @inheritdoc
   */
  async getOne(id: string, options?: RecordOptions): Promise<M> {
    return super.getOne(id, options);
  }

  /**
   * @inheritdoc
   */
  async create(bodyParams?: Record<string, unknown> | FormData, options?: RecordOptions): Promise<M> {
    return super.create(bodyParams, options);
  }

  /**
   * @inheritdoc
   *
   * If the current `client.authStore.model` matches with the updated id, then
   * on success the `client.authStore.model` will be updated with the result.
   */
  async update(id: string, bodyParams?: Record<string, unknown> | FormData, options?: RecordOptions): Promise<M> {
    return super.update(id, bodyParams, options).then(item => {
      if (
        // is record auth
        this.client.authStore.model?.id === item?.id &&
        (this.client.authStore.model?.collectionId === this.collectionIdOrName ||
          this.client.authStore.model?.collectionName === this.collectionIdOrName)
      ) {
        this.client.authStore.save(this.client.authStore.token, item);
      }

      return item;
    });
  }

  /**
   * @inheritdoc
   *
   * If the current `client.authStore.model` matches with the deleted id,
   * then on success the `client.authStore` will be cleared.
   */
  async delete(id: string, options?: CommonOptions): Promise<boolean> {
    return super.delete(id, options).then(success => {
      if (
        success &&
        // is record auth
        this.client.authStore.model?.id === id &&
        (this.client.authStore.model?.collectionId === this.collectionIdOrName ||
          this.client.authStore.model?.collectionName === this.collectionIdOrName)
      ) {
        this.client.authStore.clear();
      }

      return success;
    });
  }

  // ---------------------------------------------------------------
  // Auth handlers
  // ---------------------------------------------------------------

  /**
   * Prepare successful collection authorization response.
   */
  protected authResponse<T extends Record<string, unknown> = M>(responseData: AuthModel): RecordAuthResponse<T> {
    const record = this.decode(responseData?.record || {});

    this.client.authStore.save(responseData?.token, record);

    return Object.assign({}, responseData, {
      // normalize common fields
      token: responseData?.token || '',
      record: record,
    });
  }

  /**
   * Returns all available collection auth methods.
   *
   * @throws {ClientResponseError}
   */
  async listAuthMethods(options?: CommonOptions): Promise<AuthMethodsList> {
    options = Object.assign(
      {
        method: 'GET',
      },
      options
    );

    return this.client
      .send<AuthMethodsList>(this.baseCollectionPath + '/auth-methods', options)
      .then((responseData: AuthMethodsList) => {
        return Object.assign({}, responseData, {
          // normalize common fields
          usernamePassword: !!responseData?.usernamePassword,
          emailPassword: !!responseData?.emailPassword,
          authProviders: Array.isArray(responseData?.authProviders) ? responseData?.authProviders : [],
        });
      });
  }

  /**
   * Authenticate a single auth collection record via its username/email and password.
   *
   * On success, this method also automatically updates
   * the client's AuthStore data and returns:
   * - the authentication token
   * - the authenticated record model
   *
   * @throws {ClientResponseError}
   */
  async authWithPassword<T extends Record<string, unknown> = M>(
    usernameOrEmail: string,
    password: string,
    options: RecordOptions = {}
  ): Promise<RecordAuthResponse<T>> {
    options = {
      ...options,
      method: 'POST',
      body: JSON.stringify({
        identity: usernameOrEmail,
        password: password,
      }),
    };

    return this.client
      .send<AuthModel>(this.baseCollectionPath + '/auth-with-password', options)
      .then(data => this.authResponse<T>(data));
  }

  /**
   * Authenticate a single auth collection record with OAuth2 code.
   *
   * If you don't have an OAuth2 code you may also want to check `authWithOAuth2` method.
   *
   * On success, this method also automatically updates
   * the client's AuthStore data and returns:
   * - the authentication token
   * - the authenticated record model
   * - the OAuth2 account data (eg. name, email, avatar, etc.)
   *
   * @throws {ClientResponseError}
   */
  async authWithOAuth2Code<T extends Record<string, unknown> = M>(
    provider: string,
    code: string,
    codeVerifier: string,
    redirectUrl: string,
    createData?: Record<string, unknown>,
    options: RecordOptions = {}
  ): Promise<RecordAuthResponse<T>> {
    options = {
      ...options,
      method: 'POST',
      body: JSON.stringify({
        provider: provider,
        code: code,
        codeVerifier: codeVerifier,
        redirectUrl: redirectUrl,
        createData: createData,
      }),
    };

    return this.client
      .send<AuthModel>(this.baseCollectionPath + '/auth-with-oauth2', options)
      .then(data => this.authResponse<T>(data));
  }

  /**
   * Authenticate a single auth collection record with OAuth2
   * **without custom redirects, deeplinks or even page reload**.
   *
   * This method initializes a one-off realtime subscription and will
   * open a popup window with the OAuth2 vendor page to authenticate.
   * Once the external OAuth2 sign-in/sign-up flow is completed, the popup
   * window will be automatically closed and the OAuth2 data sent back
   * to the user through the previously established realtime connection.
   *
   * You can specify an optional `urlCallback` prop to customize
   * the default url `window.open` behavior.
   *
   * On success, this method also automatically updates
   * the client's AuthStore data and returns:
   * - the authentication token
   * - the authenticated record model
   * - the OAuth2 account data (eg. name, email, avatar, etc.)
   *
   * Example:
   *
   * ```js
   * const authData = await pb.collection("users").authWithOAuth2({
   *     provider: "google",
   * })
   * ```
   *
   * _Site-note_: when creating the OAuth2 app in the provider dashboard
   * you have to configure `https://yourdomain.com/api/oauth2-redirect`
   * as redirect URL.
   *
   * @throws {ClientResponseError}
   */
  async authWithOAuth2<T extends Record<string, unknown> = M>(
    config: OAuth2AuthConfig
  ): Promise<RecordAuthResponse<T>> {
    const authMethods = await this.listAuthMethods();

    const provider = authMethods.authProviders.find(p => p.name === config.provider);
    if (!provider) {
      throw new ClientResponseError(new Error(`Missing or invalid provider "${config.provider}".`));
    }

    const redirectUrl = this.client.buildUrl('/api/oauth2-redirect');

    // initialize a one-off realtime service
    const realtime = new RealtimeService(this.client);

    // open a new popup window in case config.urlCallback is not set
    //
    // note: it is opened before the async call due to Safari restrictions
    // (see https://github.com/pocketbase/pocketbase/discussions/2429#discussioncomment-5943061)
    let eagerDefaultPopup: Window | null = null;
    if (!config.urlCallback) {
      eagerDefaultPopup = openBrowserPopup(undefined);
    }

    function cleanup() {
      eagerDefaultPopup?.close();
      realtime.unsubscribe();
    }

    return new Promise((resolve, reject) => {
      try {
        realtime.subscribe('@oauth2', async e => {
          const oldState = realtime.clientId;

          try {
            if (!e.state || oldState !== e.state) {
              throw new Error("State parameters don't match.");
            }

            if (e.error || !e.code) {
              throw new Error('OAuth2 redirect error or missing code: ' + e.error);
            }

            // clear the non SendOptions props
            const options = Object.assign({}, config);

            const authData = await this.authWithOAuth2Code<T>(
              provider.name,
              e.code,
              provider.codeVerifier,
              redirectUrl,
              config.createData,
              {
                query: options.query,
                requestKey: options.requestKey,
              }
            );

            resolve(authData);
          } catch (err) {
            reject(new ClientResponseError(err));
          }

          cleanup();
        });

        const replacements: Record<string, string> = {
          state: realtime.clientId,
        };
        if (config.scopes?.length) {
          replacements['scope'] = config.scopes.join(' ');
        }

        const url = this._replaceQueryParams(provider.authUrl + redirectUrl, replacements);

        const urlCallback =
          config.urlCallback ||
          function (url: string) {
            if (eagerDefaultPopup) {
              eagerDefaultPopup.location.href = url;
            } else {
              // it could have been blocked due to its empty initial url,
              // try again...
              eagerDefaultPopup = openBrowserPopup(url);
            }
          };

        (async () => {
          try {
            urlCallback(url);
          } catch (err) {
            cleanup();
            reject(new ClientResponseError(err));
          }
        })();
      } catch (err) {
        cleanup();
        reject(new ClientResponseError(err));
      }
    });
  }

  /**
   * Refreshes the current authenticated record instance and
   * returns a new token and record data.
   *
   * On success this method also automatically updates the client's AuthStore.
   *
   * @throws {ClientResponseError}
   */
  async authRefresh<T extends Record<string, unknown> = M>(
    options: RecordOptions = {}
  ): Promise<RecordAuthResponse<T>> {
    return this.client
      .send<AuthModel>(this.baseCollectionPath + '/auth-refresh', options)
      .then(data => this.authResponse<T>(data));
  }

  /**
   * Sends auth record password reset request.
   *
   * @throws {ClientResponseError}
   */
  async requestPasswordReset(_email: string, options: CommonOptions = {}): Promise<boolean> {
    return this.client.send(this.baseCollectionPath + '/request-password-reset', options).then(() => true);
  }

  /**
   * Confirms auth record password reset request.
   *
   * @throws {ClientResponseError}
   */
  async confirmPasswordReset(
    passwordResetToken: string,
    password: string,
    passwordConfirm: string,
    options: CommonOptions = {}
  ): Promise<boolean> {
    options = {
      ...options,
      method: 'POST',
      body: JSON.stringify({
        token: passwordResetToken,
        password: password,
        passwordConfirm: passwordConfirm,
      }),
    };

    return !!(await this.client.send(this.baseCollectionPath + '/confirm-password-reset', options));
  }

  /**
   * Sends auth record verification email request.
   *
   * @throws {ClientResponseError}
   */
  async requestVerification(email: string, options: CommonOptions = {}): Promise<boolean> {
    options = {
      ...options,
      method: 'POST',
      body: JSON.stringify({
        email: email,
      }),
    };

    return this.client.send(this.baseCollectionPath + '/request-verification', options).then(() => true);
  }

  /**
   * Confirms auth record email verification request.
   *
   * If the current `client.authStore.model` matches with the auth record from the token,
   * then on success the `client.authStore.model.verified` will be updated to `true`.
   *
   * @throws {ClientResponseError}
   */
  async confirmVerification(verificationToken: string, options: CommonOptions = {}): Promise<boolean> {
    options = {
      ...options,
      method: 'POST',
      body: JSON.stringify({
        token: verificationToken,
      }),
    };

    if (!jwtValid(verificationToken)) return false;
    await this.client.send(this.baseCollectionPath + '/confirm-verification', options);

    // on success manually update the current auth record verified state
    const payload = getTokenPayload(verificationToken);
    const model = this.client.authStore.model;
    if (model && !model.verified && model.id === payload.id && model.collectionId === payload.collectionId) {
      model.verified = true;
      this.client.authStore.save(this.client.authStore.token, model);
    }

    return true;
  }

  /**
   * Sends an email change request to the authenticated record model.
   *
   * @throws {ClientResponseError}
   */
  async requestEmailChange(newEmail: string, options?: CommonOptions): Promise<boolean> {
    options = {
      ...options,
      method: 'POST',
      body: JSON.stringify({
        newEmail: newEmail,
      }),
    };

    return this.client.send(this.baseCollectionPath + '/request-email-change', options).then(() => true);
  }

  /**
   * Confirms auth record's new email address.
   *
   * If the current `client.authStore.model` matches with the auth record from the token,
   * then on success the `client.authStore` will be cleared.
   *
   * @throws {ClientResponseError}
   */
  async confirmEmailChange(emailChangeToken: string, password: string, options: CommonOptions = {}): Promise<boolean> {
    options = {
      method: 'POST',
      body: JSON.stringify({
        token: emailChangeToken,
        password: password,
      }),
    };

    const payload = getTokenPayload(emailChangeToken);
    await this.client.send(this.baseCollectionPath + '/confirm-email-change', options);
    const model = this.client.authStore.model;
    if (model && model.id === payload.id && model.collectionId === payload.collectionId) {
      this.client.authStore.clear();
    }

    return true;
  }

  /**
   * Lists all linked external auth providers for the specified auth record.
   *
   * @throws {ClientResponseError}
   */
  async listExternalAuths(recordId: string, options?: CommonOptions): Promise<ExternalAuthModel[]> {
    options = Object.assign(
      {
        method: 'GET',
      },
      options
    );

    return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(recordId) + '/external-auths', options);
  }

  /**
   * Unlink a single external auth provider from the specified auth record.
   *
   * @throws {ClientResponseError}
   */
  async unlinkExternalAuth(recordId: string, provider: string, options?: CommonOptions): Promise<boolean> {
    options = Object.assign(
      {
        method: 'DELETE',
      },
      options
    );

    return this.client
      .send(
        this.baseCrudPath + '/' + encodeURIComponent(recordId) + '/external-auths/' + encodeURIComponent(provider),
        options
      )
      .then(() => true);
  }

  // ---------------------------------------------------------------

  // very rudimentary url query params replacement because at the moment
  // URL (and URLSearchParams) doesn't seem to be fully supported in React Native
  //
  // note: for details behind some of the decode/encode parsing check https://unixpapa.com/js/querystring.html
  private _replaceQueryParams(url: string, replacements: Record<string, string> = {}): string {
    let urlPath = url;
    let query = '';

    const queryIndex = url.indexOf('?');
    if (queryIndex >= 0) {
      urlPath = url.substring(0, url.indexOf('?'));
      query = url.substring(url.indexOf('?') + 1);
    }

    const parsedParams: Record<string, string> = {};

    // parse the query parameters
    const rawParams = query.split('&');
    for (const param of rawParams) {
      if (param == '') {
        continue;
      }

      const pair = param.split('=');
      parsedParams[decodeURIComponent(pair[0].replace(/\+/g, ' '))] = decodeURIComponent(
        (pair[1] || '').replace(/\+/g, ' ')
      );
    }

    // apply the replacements
    for (const key in replacements) {
      if (!(key in replacements)) continue;

      if (replacements[key] == null) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete parsedParams[key];
      } else {
        parsedParams[key] = replacements[key];
      }
    }

    // construct back the full query string
    query = '';
    for (const key in parsedParams) {
      if (!(key in parsedParams)) continue;

      if (query != '') query += '&';

      query +=
        encodeURIComponent(key.replace(/%20/g, '+')) + '=' + encodeURIComponent(parsedParams[key].replace(/%20/g, '+'));
    }

    return query != '' ? urlPath + '?' + query : urlPath;
  }
}

function openBrowserPopup(url?: string): Window | null {
  if (typeof window === 'undefined' || !window?.open) {
    throw new ClientResponseError(new Error(`Not in a browser context - please pass a custom urlCallback function.`));
  }

  let width = 1024;
  let height = 768;

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // normalize window size
  width = width > windowWidth ? windowWidth : width;
  height = height > windowHeight ? windowHeight : height;

  const left = windowWidth / 2 - width / 2;
  const top = windowHeight / 2 - height / 2;

  // note: we don't use the noopener and noreferrer attributes since
  // for some reason browser blocks such windows then url is undefined/blank
  return window.open(
    url,
    'popup_window',
    'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',resizable,menubar=no'
  );
}
