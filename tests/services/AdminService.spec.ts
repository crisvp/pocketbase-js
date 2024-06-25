import {
    describe,
    assert,
    test,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    vi,
    expect,
} from "vitest";
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { AdminService } from "@/services/AdminService";
import { AdminModel } from "@/services/utils/dtos";
import { respond } from "../setup";
import { http, HttpResponse } from "msw";

vi.mock("../mocks");

function dummyJWT(payload = {}) {
    const buf = Buffer.from(JSON.stringify(payload));
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + buf.toString("base64") + ".test";
}

describe("AdminService", function () {
    let client!: Client;
    let service!: AdminService;

    beforeEach(() => void vi.useFakeTimers());
    afterEach(() => void vi.useRealTimers());
    afterEach(() => void vi.clearAllMocks());

    function initService() {
        client = new Client("http://test.host");
        service = new AdminService(client);
    }

    initService();

    const fetchMock = new FetchMock();

    beforeEach(function () {
        initService();
        service.client.authStore.clear(); // reset
    });

    beforeAll(function () {
        fetchMock.init();
    });

    afterAll(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();
    });

    function authResponseCheck(
        result: Record<string, unknown>,
        expectedToken: string,
        expectedAdmin: Partial<AdminModel>,
    ) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.deepEqual(result.admin, expectedAdmin);
        assert.equal(service.client.authStore.token, expectedToken);
        assert.deepEqual(service.client.authStore.model, expectedAdmin);
    }

    // more tests:
    // ---------------------------------------------------------------

    describe("AuthStore sync", function () {
        test("Should update the AuthStore admin model on matching update id", async function () {
            respond(
                http.patch("*/api/admins/test123", () =>
                    HttpResponse.json({ id: "test123", email: "new@example.com" }),
                ),
            );
            service.client.authStore.save("test_token", {
                id: "test123",
                email: "old@example.com",
            });

            await service.update("test123", { email: "new@example.com" });

            assert.equal(service.client.authStore.model?.email, "new@example.com");
        });

        test("Should not update the AuthStore admin model on mismatched update id", async function () {
            respond(
                http.patch("*/api/admins/test123", () =>
                    HttpResponse.json({ id: "test123", email: "new@example.com" }),
                ),
            );

            service.client.authStore.save("test_token", {
                id: "test456",
                email: "old@example.com",
            });

            await service.update("test123", { email: "new@example.com" });

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        test("Should delete the AuthStore admin model on matching delete id", async function () {
            respond(
                http.delete("*/api/admins/test123", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            service.client.authStore.save("test_token", { id: "test123" });

            await service.delete("test123");

            assert.isNull(service.client.authStore.model);
        });

        test("Should not delete the AuthStore admin model on mismatched delete id", async function () {
            respond(
                http.delete("*/api/admins/test123", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            service.client.authStore.save("test_token", { id: "test456" });

            await service.delete("test123");

            assert.isNotNull(service.client.authStore.model);
        });
    });

    describe("authWithPassword()", function () {
        test("Should auth an admin by its email and password", async function () {
            respond(
                http.post("*/api/admins/auth-with-password", async ({ request }) => {
                    const body = await request.json();
                    expect(body).toEqual({
                        identity: "test@example.com",
                        password: "123456",
                    });
                    return HttpResponse.json({
                        token: "token_authorize",
                        admin: { id: "id_authorize" },
                    });
                }),
            );

            const result = await service.authWithPassword("test@example.com", "123456", {
                q1: 456,
                headers: { "x-test": "123" },
            });

            authResponseCheck(
                result,
                "token_authorize",
                service.decode({ id: "id_authorize" }),
            );
        });
    });

    describe("authRefresh()", function () {
        test("Should refresh an authorized admin instance", async function () {
            respond(
                http.post("*/api/admins/auth-refresh", () =>
                    HttpResponse.json({
                        token: "token_refresh",
                        admin: { id: "id_refresh" },
                    }),
                ),
            );

            const result = await service.authRefresh({
                q1: 456,
                headers: { "x-test": "123" },
            });

            authResponseCheck(
                result,
                "token_refresh",
                service.decode({ id: "id_refresh" }),
            );
        });
    });

    describe("requestPasswordReset()", function () {
        test("Should send a password reset request", async function () {
            respond(
                http.post("*/api/admins/request-password-reset", async ({ request }) => {
                    expect(await request.json()).toEqual({ email: "test@example.com" });
                    return HttpResponse.json({ status: 204 });
                }),
            );
            const result = await service.requestPasswordReset("test@example.com", {
                q1: 456,
                headers: { "x-test": "123" },
            });

            assert.isTrue(result);
        });
    });

    describe("confirmPasswordReset()", function () {
        test("Should confirm a password reset request", async function () {
            respond(
                http.post("*/api/admins/confirm-password-reset", async ({ request }) => {
                    const body = await request.json();
                    expect(body).toEqual({
                        token: "test",
                        password: "123",
                        passwordConfirm: "456",
                    });
                    return HttpResponse.json({ status: 204 });
                }),
            );

            const result = await service.confirmPasswordReset("test", "123", "456", {
                q1: 456,
                headers: { "x-test": "123" },
            });

            assert.isTrue(result);
        });
    });

    describe("auto refresh", function () {
        const makeAuthSpy = (token: string) =>
            vi.fn(async ({ request }) => {
                const body = await request.json();
                expect(body).toEqual({
                    identity: "test@example.com",
                    password: "123456",
                });
                return HttpResponse.json({ token, admin: { id: "test_id" } });
            });

        const makeRefreshSpy = (token: string) =>
            vi.fn(async () => HttpResponse.json({ token, admin: { id: "test_id" } }));

        const customSpy = vi.fn(() => HttpResponse.json({ status: 200 }));

        test("no threshold - should do nothing in addition if the token has expired", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() - 1 * 60000).getTime() / 1000) << 0,
            });

            respond(
                http.post("*/api/admins/auth-with-password", makeAuthSpy(token)),
                http.get("*/custom", customSpy),
            );

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 0,
                    query: { a: 1 },
                },
            );

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));

            await service.client.send("/custom", {});
        });

        test("new auth - should reset the auto refresh handling", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() - 1 * 60000).getTime() / 1000) << 0,
            });

            const authWithPasswordSpy = makeAuthSpy(token);
            respond(
                http.post("*/api/admins/auth-with-password", authWithPasswordSpy),
                http.get("*/custom", customSpy),
            );

            const authResult1 = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );
            authResponseCheck(authResult1, token, service.decode({ id: "test_id" }));

            // manually reauthenticate without the auto refresh threshold
            const authResult2 = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    query: { a: 1 },
                },
            );
            authResponseCheck(authResult2, token, service.decode({ id: "test_id" }));

            await service.client.send("/custom", {});
            await service.client.send("/custom", {});

            expect(authWithPasswordSpy).toHaveBeenCalledTimes(2);
            expect(customSpy).toHaveBeenCalledTimes(2);
        });

        test("should do nothing if the token is still valid", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() + 31 * 60000).getTime() / 1000) << 0,
            });

            respond(
                http.post("*/api/admins/auth-with-password", makeAuthSpy(token)),
                http.get("*/custom", customSpy),
            );

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );

            await service.client.send("/custom", {});

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));
        });

        test("should call authRefresh if the token is going to expire", async function () {
            const date = new Date(2020, 1, 1, 13);
            vi.setSystemTime(date);

            const tokenTime = (date.getTime() + 29 * 6000) / 1000;
            const newTokenTime = (date.getTime() + 31 * 6000) / 1000;

            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: tokenTime,
            });

            const newToken = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: newTokenTime,
            });

            const authWithPasswordSpy = makeAuthSpy(token);
            const authRefreshSpy = makeRefreshSpy(newToken);

            respond(
                http.post("*/api/admins/auth-with-password", authWithPasswordSpy),
                http.post("*/api/admins/auth-refresh", authRefreshSpy),
                http.get("*/custom", customSpy),
            );

            await service.authWithPassword("test@example.com", "123456", {
                autoRefreshThreshold: 30 * 60,
                query: { a: 1 },
            });

            expect(service.client.authStore.token).toEqual(token);
            await service.client.send("/custom", {});
            await service.client.send("/custom", {});
            expect(service.client.authStore.token).not.toEqual(token);
            expect(service.client.authStore.token).toEqual(newToken);

            expect(authWithPasswordSpy).toHaveBeenCalledTimes(1);
            expect(authRefreshSpy).toHaveBeenCalledTimes(2);
            expect(customSpy).toHaveBeenCalledTimes(2);
        });

        test("should reauthenticate if the token is going to expire and the auto authRefresh fails", async function () {
            const date = new Date(2020, 1, 1, 13);
            vi.setSystemTime(date);

            const tokenTime = (date.getTime() + 29 * 6000) / 1000;
            const newTokenTime = (date.getTime() + 31 * 6000) / 1000;

            const token = dummyJWT({ id: "test_id", type: "admin", exp: tokenTime });
            const newToken = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: newTokenTime,
            });

            const authWithPasswordSpy = makeAuthSpy(token);
            const authRefreshSpy = makeRefreshSpy(newToken);
            respond(
                http.post("*/api/admins/auth-with-password", authWithPasswordSpy),
                http.post("*/api/admins/auth-refresh", authRefreshSpy),
                http.get("*/custom", customSpy),
            );

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));

            authRefreshSpy.mockReturnValueOnce(
                Promise.resolve(HttpResponse.json({ status: 400 })),
            );

            await service.client.send("/custom", {});
            authRefreshSpy.mockReturnValue(
                Promise.resolve(
                    HttpResponse.json({ token: newToken, admin: { id: "test_id" } }),
                ),
            );

            await service.client.send("/custom", {});

            expect(authWithPasswordSpy).toHaveBeenCalledTimes(1);
            expect(authRefreshSpy).toHaveBeenCalledTimes(2);
            expect(customSpy).toHaveBeenCalledTimes(2);

            assert.equal(service.client.authStore.token, newToken);
        });

        test("should reauthenticate if the token is expired", async function () {
            const date = new Date(2020, 1, 1, 13);
            vi.setSystemTime(date);

            const tokenTime = (date.getTime() - 1) / 1000;
            const newTokenTime = (date.getTime() + 31 * 6000) / 1000;

            const token = dummyJWT({ id: "test_id", type: "admin", exp: tokenTime });
            const newToken = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: newTokenTime,
            });

            const authWithPasswordSpy = makeAuthSpy(token);
            const authRefreshSpy = makeRefreshSpy(newToken);

            respond(
                http.post("*/api/admins/auth-with-password", authWithPasswordSpy),
                http.post("*/api/admins/auth-refresh", authRefreshSpy),
                http.get("*/custom", customSpy),
            );

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));
            expect(service.client.authStore.token).toEqual(token);
            expect(service.client.authStore.isValid).toBeFalsy();

            authWithPasswordSpy.mockReturnValueOnce(
                Promise.resolve(
                    HttpResponse.json({ token: newToken, admin: { id: "test_id" } }),
                ),
            );
            await service.client.send("/custom", {});
            await service.client.send("/custom", {});
            expect(service.client.authStore.token).toEqual(newToken);

            expect(authWithPasswordSpy).toHaveBeenCalledTimes(2);
            expect(authRefreshSpy).toHaveBeenCalledTimes(0);
            expect(customSpy).toHaveBeenCalledTimes(2);
        });
    });
});
