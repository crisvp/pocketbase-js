import { BaseAuthStore, AuthModel } from '@/stores/BaseAuthStore';

export type AsyncSaveFunc = (serializedPayload: string) => Promise<void>;
export type AsyncClearFunc = () => Promise<void>;

export type AsyncInit = string | Promise<string> | Promise<Record<string, unknown> & { token: string }>;

/**
 * AsyncAuthStore is a helper auth store implementation
 * that could be used with any external async persistent layer
 * (key-value db, local file, etc.).
 *
 * Here is an example with the React Native AsyncStorage package:
 *
 * ```
 * import AsyncStorage from "@react-native-async-storage/async-storage";
 * import PocketBase, { AsyncAuthStore } from "pocketbase";
 *
 * const store = new AsyncAuthStore({
 *     save:    async (serialized) => AsyncStorage.setItem("pb_auth", serialized),
 *     initial: AsyncStorage.getItem("pb_auth"),
 * });
 *
 * const pb = new PocketBase("https://example.com", store)
 * ```
 */
export class AsyncAuthStore extends BaseAuthStore {
  private saveFunc: AsyncSaveFunc;
  private clearFunc?: AsyncClearFunc;

  constructor(config: {
    // The async function that is called every time
    // when the auth store state needs to be persisted.
    save: AsyncSaveFunc;

    /// An *optional* async function that is called every time
    /// when the auth store needs to be cleared.
    ///
    /// If not explicitly set, `saveFunc` with empty data will be used.
    clear?: AsyncClearFunc;

    // An *optional* initial data to load into the store.
    initial?: AsyncInit;
  }) {
    super();

    this.saveFunc = config.save;
    this.clearFunc = config.clear;
    this.#loadInitial(config.initial);
  }

  /**
   * @inheritdoc
   */
  async save(token: string, model?: AuthModel) {
    if (!model) throw new Error('AsyncAuthStore: model data is required.');
    super.save(token, model);

    try {
      const value = JSON.stringify({ token, model });
      await this.saveFunc(value);
    } catch (err) {
      console.warn('AsyncAuthStore: failed to stringify the new state');
    }
  }

  /**
   * @inheritdoc
   */
  async clear() {
    super.clear();

    const { clearFunc, saveFunc } = this;
    if (clearFunc) await clearFunc();
    else await saveFunc('');
  }

  /**
   * Initializes the auth store state.
   */
  async #loadInitial(payload?: string | Promise<unknown>) {
    try {
      const resolvedPayload = await payload;

      if (resolvedPayload) {
        let parsed;
        if (typeof resolvedPayload === 'string') {
          parsed = JSON.parse(resolvedPayload) || {};
        } else if (typeof resolvedPayload === 'object') {
          parsed = resolvedPayload;
        }

        this.save(parsed.token || '', parsed.model || null);
      }
    } catch (e) {
      console.warn('AsyncAuthStore: failed to load initial state', e);
    }
  }
}
