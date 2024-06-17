import { ClientResponseError } from "@/ClientResponseError";
import { BaseService } from "@/services/utils/BaseService";
import { SendOptions, normalizeUnknownQueryParams } from "@/services/utils/options";

interface promiseCallbacks {
    resolve: (value: void | PromiseLike<void>) => void;
    reject: (...args: unknown[]) => void;
}

type Subscriptions = Record<string, EventListener[]>;

export type UnsubscribeFunc = () => Promise<void>;

export interface SubscriptionData {
    state: string;
    error: string;
    code: string;
}

export class RealtimeService extends BaseService {
    clientId = "";

    private eventSource: EventSource | null = null;
    private subscriptions: Subscriptions = {};
    private lastSentSubscriptions: string[] = [];
    private connectTimeoutId: ReturnType<typeof setTimeout> | undefined;
    private maxConnectTimeout = 15000;
    private reconnectTimeoutId: ReturnType<typeof setTimeout> | undefined;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = Infinity;
    private predefinedReconnectIntervals = [200, 300, 500, 1000, 1200, 1500, 2000];
    private pendingConnects: promiseCallbacks[] = [];

    /**
     * Returns whether the realtime connection has been established.
     */
    get isConnected(): boolean {
        return !!this.eventSource && !!this.clientId && !this.pendingConnects.length;
    }

    /**
     * Register the subscription listener.
     *
     * You can subscribe multiple times to the same topic.
     *
     * If the SSE connection is not started yet,
     * this method will also initialize it.
     */

    async subscribe<T>(
        topic: string,
        callback: (data: T & SubscriptionData) => void,
        options?: SendOptions,
    ): Promise<UnsubscribeFunc> {
        if (!topic) {
            throw new Error("topic must be set.");
        }

        let key = topic;

        // serialize and append the topic options (if any)
        if (options) {
            normalizeUnknownQueryParams(options);
            const serialized =
                "options=" +
                encodeURIComponent(
                    JSON.stringify({
                        query: options.query,
                        headers: options.headers,
                    }),
                );
            key += (key.includes("?") ? "&" : "?") + serialized;
        }

        const listener = function (e: Event & { data?: string }) {
            let data: T & SubscriptionData;
            try {
                data = JSON.parse(e.data ?? "{}");
                callback(data);
            } catch {
                /* ignore */
            }
        };

        // store the listener
        if (!this.subscriptions[key]) {
            this.subscriptions[key] = [];
        }
        this.subscriptions[key].push(listener);

        if (!this.isConnected) {
            // initialize sse connection
            await this.connect();
        } else if (this.subscriptions[key].length === 1) {
            // send the updated subscriptions (if it is the first for the key)
            await this.submitSubscriptions();
        } else {
            // only register the listener
            this.eventSource?.addEventListener(key, listener);
        }

        return async (): Promise<void> => {
            return this.unsubscribeByTopicAndListener(topic, listener);
        };
    }

    /**
     * Unsubscribe from all subscription listeners with the specified topic.
     *
     * If `topic` is not provided, then this method will unsubscribe
     * from all active subscriptions.
     *
     * This method is no-op if there are no active subscriptions.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    async unsubscribe(topic?: string): Promise<void> {
        let needToSubmit = false;

        if (!topic) {
            // remove all subscriptions
            this.subscriptions = {};
        } else {
            // remove all listeners related to the topic
            const subs = this.getSubscriptionsByTopic(topic);
            for (const key in subs) {
                if (!this.hasSubscriptionListeners(key)) {
                    continue; // already unsubscribed
                }

                for (const listener of this.subscriptions[key]) {
                    this.eventSource?.removeEventListener(key, listener);
                }
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete this.subscriptions[key];

                // mark for subscriptions change submit if there are no other listeners
                if (!needToSubmit) {
                    needToSubmit = true;
                }
            }
        }

        if (!this.hasSubscriptionListeners()) {
            // no other active subscriptions -> close the sse connection
            this.disconnect();
        } else if (needToSubmit) {
            await this.submitSubscriptions();
        }
    }

    /**
     * Unsubscribe from all subscription listeners starting with the specified topic prefix.
     *
     * This method is no-op if there are no active subscriptions with the specified topic prefix.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    async unsubscribeByPrefix(keyPrefix: string): Promise<void> {
        let hasAtleastOneTopic = false;
        for (const key in this.subscriptions) {
            // "?" so that it can be used as end delimiter for the prefix
            if (!(key + "?").startsWith(keyPrefix)) {
                continue;
            }

            hasAtleastOneTopic = true;
            for (const listener of this.subscriptions[key]) {
                this.eventSource?.removeEventListener(key, listener);
            }
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.subscriptions[key];
        }

        if (!hasAtleastOneTopic) {
            return; // nothing to unsubscribe from
        }

        if (this.hasSubscriptionListeners()) {
            // submit the deleted subscriptions
            await this.submitSubscriptions();
        } else {
            // no other active subscriptions -> close the sse connection
            this.disconnect();
        }
    }

    /**
     * Unsubscribe from all subscriptions matching the specified topic and listener function.
     *
     * This method is no-op if there are no active subscription with
     * the specified topic and listener.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    async unsubscribeByTopicAndListener(
        topic: string,
        listener: EventListener,
    ): Promise<void> {
        let needToSubmit = false;

        const subs = this.getSubscriptionsByTopic(topic);
        for (const key in subs) {
            if (
                !Array.isArray(this.subscriptions[key]) ||
                !this.subscriptions[key].length
            ) {
                continue; // already unsubscribed
            }

            let exist = false;
            for (let i = this.subscriptions[key].length - 1; i >= 0; i--) {
                if (this.subscriptions[key][i] !== listener) {
                    continue;
                }

                exist = true; // has at least one matching listener
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete this.subscriptions[key][i]; // removes the function reference
                this.subscriptions[key].splice(i, 1); // reindex the array
                this.eventSource?.removeEventListener(key, listener);
            }
            if (!exist) {
                continue;
            }

            // remove the key from the subscriptions list if there are no other listeners
            if (!this.subscriptions[key].length) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete this.subscriptions[key];
            }

            // mark for subscriptions change submit if there are no other listeners
            if (!needToSubmit && !this.hasSubscriptionListeners(key)) {
                needToSubmit = true;
            }
        }

        if (!this.hasSubscriptionListeners()) {
            // no other active subscriptions -> close the sse connection
            this.disconnect();
        } else if (needToSubmit) {
            await this.submitSubscriptions();
        }
    }

    private hasSubscriptionListeners(keyToCheck?: string): boolean {
        this.subscriptions = this.subscriptions || {};

        // check the specified key
        if (keyToCheck) {
            return !!this.subscriptions[keyToCheck]?.length;
        }

        // check for at least one non-empty subscription
        for (const key in this.subscriptions) {
            if (this.subscriptions[key]?.length) {
                return true;
            }
        }

        return false;
    }

    private async submitSubscriptions(): Promise<void> {
        if (!this.clientId) {
            return; // no client/subscriber
        }

        // optimistic update
        this.addAllSubscriptionListeners();

        this.lastSentSubscriptions = this.getNonEmptySubscriptionKeys();

        return this.client
            .send("/api/realtime", {
                method: "POST",
                body: JSON.stringify({
                    clientId: this.clientId,
                    subscriptions: this.lastSentSubscriptions,
                }),
                requestKey: this.getSubscriptionsCancelKey(),
            })
            .catch((err) => {
                if (err?.isAbort) {
                    return; // silently ignore aborted pending requests
                }
                throw err;
            });
    }

    private getSubscriptionsCancelKey(): string {
        return "realtime_" + this.clientId;
    }

    private getSubscriptionsByTopic(topic: string): Subscriptions {
        const result: Subscriptions = {};

        // "?" so that it can be used as end delimiter for the topic
        topic = topic.includes("?") ? topic : topic + "?";

        for (const key in this.subscriptions) {
            if ((key + "?").startsWith(topic)) {
                result[key] = this.subscriptions[key];
            }
        }

        return result;
    }

    private getNonEmptySubscriptionKeys(): string[] {
        const result: string[] = [];

        for (const key in this.subscriptions) {
            if (this.subscriptions[key].length) {
                result.push(key);
            }
        }

        return result;
    }

    private addAllSubscriptionListeners(): void {
        if (!this.eventSource) {
            return;
        }

        this.removeAllSubscriptionListeners();

        for (const key in this.subscriptions) {
            for (const listener of this.subscriptions[key]) {
                this.eventSource.addEventListener(key, listener);
            }
        }
    }

    private removeAllSubscriptionListeners(): void {
        if (!this.eventSource) {
            return;
        }

        for (const key in this.subscriptions) {
            for (const listener of this.subscriptions[key]) {
                this.eventSource.removeEventListener(key, listener);
            }
        }
    }

    private async connect(): Promise<void> {
        if (this.reconnectAttempts > 0) {
            // immediately resolve the promise to avoid indefinitely
            // blocking the client during reconnection
            return;
        }

        return new Promise<void>((resolve, reject) => {
            this.pendingConnects.push({ resolve, reject });

            if (this.pendingConnects.length > 1) {
                // all promises will be resolved once the connection is established
                return;
            }

            this.initConnect();
        });
    }

    private initConnect() {
        this.disconnect(true);

        // wait up to 15s for connect
        clearTimeout(this.connectTimeoutId);
        this.connectTimeoutId = setTimeout(() => {
            this.connectErrorHandler(new Error("EventSource connect took too long."));
        }, this.maxConnectTimeout);

        this.eventSource = new EventSource(this.client.buildUrl("/api/realtime"));

        this.eventSource.onerror = () => {
            this.connectErrorHandler(
                new Error("Failed to establish realtime connection."),
            );
        };

        this.eventSource.addEventListener("PB_CONNECT", (e) => {
            const msgEvent = e as MessageEvent;
            this.clientId = msgEvent?.lastEventId;

            this.submitSubscriptions()
                .then(async () => {
                    let retries = 3;
                    while (this.hasUnsentSubscriptions() && retries > 0) {
                        retries--;
                        // resubscribe to ensure that the latest topics are submitted
                        //
                        // This is needed because missed topics could happen on reconnect
                        // if after the pending sent `submitSubscriptions()` call another `subscribe()`
                        // was made before the submit was able to complete.
                        await this.submitSubscriptions();
                    }
                })
                .then(() => {
                    for (const p of this.pendingConnects) {
                        p.resolve();
                    }

                    // reset connect meta
                    this.pendingConnects = [];
                    this.reconnectAttempts = 0;
                    clearTimeout(this.reconnectTimeoutId);
                    clearTimeout(this.connectTimeoutId);

                    // propagate the PB_CONNECT event
                    const connectSubs = this.getSubscriptionsByTopic("PB_CONNECT");
                    for (const key in connectSubs) {
                        for (const listener of connectSubs[key]) {
                            listener(e);
                        }
                    }
                })
                .catch((err) => {
                    this.clientId = "";
                    this.connectErrorHandler(err);
                });
        });
    }

    private hasUnsentSubscriptions(): boolean {
        const latestTopics = this.getNonEmptySubscriptionKeys();
        if (latestTopics.length != this.lastSentSubscriptions.length) {
            return true;
        }

        for (const t of latestTopics) {
            if (!this.lastSentSubscriptions.includes(t)) {
                return true;
            }
        }

        return false;
    }

    private connectErrorHandler(err: unknown) {
        clearTimeout(this.connectTimeoutId);
        clearTimeout(this.reconnectTimeoutId);

        if (
            // wasn't previously connected -> direct reject
            (!this.clientId && !this.reconnectAttempts) ||
            // was previously connected but the max reconnection limit has been reached
            this.reconnectAttempts > this.maxReconnectAttempts
        ) {
            for (const p of this.pendingConnects) {
                p.reject(new ClientResponseError(err));
            }
            this.pendingConnects = [];
            this.disconnect();
            return;
        }

        // otherwise -> reconnect in the background
        this.disconnect(true);
        const timeout =
            this.predefinedReconnectIntervals[this.reconnectAttempts] ||
            this.predefinedReconnectIntervals[
                this.predefinedReconnectIntervals.length - 1
            ];
        this.reconnectAttempts++;
        this.reconnectTimeoutId = setTimeout(() => {
            this.initConnect();
        }, timeout);
    }

    private disconnect(fromReconnect = false): void {
        clearTimeout(this.connectTimeoutId);
        clearTimeout(this.reconnectTimeoutId);
        this.removeAllSubscriptionListeners();
        this.client.cancelRequest(this.getSubscriptionsCancelKey());
        this.eventSource?.close();
        this.eventSource = null;
        this.clientId = "";

        if (!fromReconnect) {
            this.reconnectAttempts = 0;

            // resolve any remaining connect promises
            //
            // this is done to avoid unnecessary throwing errors in case
            // unsubscribe is called before the pending connect promises complete
            // (see https://github.com/pocketbase/pocketbase/discussions/2897#discussioncomment-6423818)
            for (const p of this.pendingConnects) {
                p.resolve();
            }
            this.pendingConnects = [];
        }
    }
}
