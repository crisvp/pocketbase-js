import { CrudService } from "@/services/utils/CrudService";
import { AdminModel } from "@/services/utils/dtos";
import { AuthOptions, CommonOptions, SendOptions } from "@/services/utils/options";
import { registerAutoRefresh, resetAutoRefresh } from "@/services/utils/refresh";

export interface AdminAuthResponse {
    [key: string]: unknown;

    token: string;
    admin: AdminModel;
}

export class AdminService extends CrudService<AdminModel> {
    /**
     * @inheritdoc
     */
    readonly baseCrudPath = "/api/admins";

    // ---------------------------------------------------------------
    // Post update/delete AuthStore sync
    // ---------------------------------------------------------------

    /**
     * @inheritdoc
     *
     * If the current `client.authStore.model` matches with the updated id, then
     * on success the `client.authStore.model` will be updated with the result.
     */
    async update(
        id: string,
        bodyParams?: Record<string, unknown> | FormData,
        options?: CommonOptions,
    ): Promise<AdminModel> {
        const item = await super.update(id, bodyParams, options);
        if (
            this.client.authStore.model?.id === item.id &&
            typeof this.client.authStore.model?.collectionId === "undefined"
        ) {
            // is not record auth
            this.client.authStore.save(this.client.authStore.token, item);
        }
        return item;
    }

    /**
     * @inheritdoc
     *
     * If the current `client.authStore.model` matches with the deleted id,
     * then on success the `client.authStore` will be cleared.
     */
    async delete(id: string, options?: CommonOptions): Promise<boolean> {
        return super.delete(id, options).then((success) => {
            // clear the store state if the deleted item id matches with the stored model
            if (
                success &&
                this.client.authStore.model?.id === id &&
                typeof this.client.authStore.model?.collectionId === "undefined" // is not record auth
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
     * Prepare successful authorize response.
     */
    protected authResponse(responseData: Partial<AdminAuthResponse>): AdminAuthResponse {
        const admin = this.decode(responseData?.admin || {});

        if (responseData?.token && responseData?.admin) {
            this.client.authStore.save(responseData.token, admin);
        }

        return Object.assign({}, responseData, {
            // normalize common fields
            token: responseData?.token || "",
            admin: admin,
        });
    }

    /**
     * Authenticate an admin account with its email and password
     * and returns a new admin token and data.
     *
     * On success this method automatically updates the client's AuthStore data.
     *
     * @throws {ClientResponseError}
     */
    async authWithPassword(
        email: string,
        password: string,
        options: AuthOptions = {},
    ): Promise<AdminAuthResponse> {
        const autoRefreshThreshold = options.autoRefreshThreshold;
        delete options.autoRefreshThreshold;

        if (!autoRefreshThreshold) resetAutoRefresh(this.client);

        const request: SendOptions = {
            method: "POST",
            body: JSON.stringify({ identity: email, password }),
            ...options,
        };

        // not from auto refresh reauthentication

        let authData = await this.client.send<AdminAuthResponse>(
            this.baseCrudPath + "/auth-with-password",
            request,
        );

        authData = this.authResponse(authData);

        if (autoRefreshThreshold) {
            registerAutoRefresh(
                this.client,
                autoRefreshThreshold,
                () => this.authRefresh({ autoRefresh: true }),
                () =>
                    this.authWithPassword(
                        email,
                        password,
                        Object.assign({ autoRefresh: true }, options),
                    ),
            );
        }

        return authData;
    }

    /**
     * Refreshes the current admin authenticated instance and
     * returns a new token and admin data.
     *
     * On success this method automatically updates the client's AuthStore data.
     *
     * @throws {ClientResponseError}
     */

    async authRefresh(options?: CommonOptions): Promise<AdminAuthResponse> {
        options = { method: "POST", ...options };

        const result = await this.client.send<AdminAuthResponse>(
            this.baseCrudPath + "/auth-refresh",
            options,
        );
        this.client.authStore.save(result.token, result.admin);
        return result;
    }

    /**
     * Sends admin password reset request.
     *
     * @throws {ClientResponseError}
     */
    async requestPasswordReset(email: string, options?: CommonOptions): Promise<boolean> {
        options = {
            method: "POST",
            body: JSON.stringify({ email }),
            ...options,
        };

        return this.client
            .send(this.baseCrudPath + "/request-password-reset", options)
            .then(() => true);
    }

    /**
     * Confirms admin password reset request.
     *
     * @throws {ClientResponseError}
     */
    async confirmPasswordReset(
        resetToken: string,
        password: string,
        passwordConfirm: string,
        options?: CommonOptions,
    ): Promise<boolean> {
        options = {
            method: "POST",
            body: JSON.stringify({
                token: resetToken,
                password: password,
                passwordConfirm: passwordConfirm,
            }),
            ...options,
        };

        return this.client
            .send(this.baseCrudPath + "/confirm-password-reset", options)
            .then(() => true);
    }
}
