import { describe, assert, beforeEach, vi, afterEach } from "vitest";
import Client from "@/Client";
import { RecordAuthResponse, RecordService } from "@/services/RecordService";
import { RecordModel } from "@/services/utils/dtos";

import { test } from "../test";
import { http, HttpResponse } from "msw";
import { dummyJWT, respond } from "../setup";

describe("RecordService", async () => {
    let client: Client;
    let service: RecordService;

    beforeEach(() => {
        client = new Client("http://test.host");
        service = new RecordService(client, "sub=");
    });

    const authToken = await dummyJWT({ id: "test123", collectionId: "456" });

    beforeEach(() => {
        vi.useFakeTimers();
        const date = new Date(2000, 1, 1, 13);
        vi.setSystemTime(date);
    });
    afterEach(() => void vi.clearAllMocks());

    beforeEach(function () {
        service.client.authStore.clear(); // reset
    });

    describe("AuthStore sync", function () {
        test("Should update the AuthStore record model on matching update id and collection", async function () {
            respond(
                http.patch("*/api/collections/sub%3D/records/test123", () =>
                    HttpResponse.json({ id: "test123", email: "new@example.com" }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "test123",
                collectionName: "sub=",
            });

            await service.update("test123", {});

            assert.equal(service.client.authStore.model?.email, "new@example.com");
        });

        test("Should not update the AuthStore record model on matching id but mismatched collection", async function () {
            respond(
                http.patch("*/api/collections/sub%3D/records/test123", () =>
                    HttpResponse.json({ id: "test123", email: "new@example.com" }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "test123",
                email: "old@example.com",
                collectionName: "diff",
            });

            await service.update("test123", {});

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        test("Should not update the AuthStore record model on mismatched update id", async function () {
            respond(
                http.patch("*/api/collections/sub%3D/records/test123", () =>
                    HttpResponse.json({ id: "test123", email: "new@example.com" }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "test456",
                email: "old@example.com",
                collectionName: "sub=",
            });

            await service.update("test123", {});

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        test("Should delete the AuthStore record model on matching delete id and collection", async function () {
            respond(
                http.delete("*/api/collections/sub%3D/records/test123", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "test123",
                collectionName: "sub=",
            });

            await service.delete("test123");

            assert.isNull(service.client.authStore.model);
        });

        test("Should not delete the AuthStore record model on matching delete id but mismatched collection", async function () {
            respond(
                http.delete("*/api/collections/sub%3D/records/test123", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "test123",
                collectionName: "diff",
            });

            await service.delete("test123");

            assert.isNotNull(service.client.authStore.model);
        });

        test("Should not delete the AuthStore record model on mismatched delete id", async function () {
            respond(
                http.delete("*/api/collections/sub%3D/records/test123", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "test456",
                collectionName: "sub=",
            });

            await service.delete("test123");

            assert.isNotNull(service.client.authStore.model);
        });

        test("Should update the AuthStore record model verified state on matching token data", async function () {
            const token = authToken;

            respond(
                http.post("*/api/collections/sub%3D/confirm-verification", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "test123",
                collectionId: "456",
                verified: false,
            });

            const result = await service.confirmVerification(token);

            assert.isTrue(result);
            assert.isTrue(service.client.authStore.model?.verified);
        });

        test("Should not update the AuthStore record model verified state on mismatched token data", async function () {
            const token = await dummyJWT({ id: "456", collectionId: "789" });
            // ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInR5cGUiOiJhdXRoUmVjb3JkIiwiY29sbGVjdGlvbklkIjoiNDU2In0.c9ZkXkC8rSqkKlpyx3kXt9ID3qYsIoy1Vz3a2m3ly0c");

            respond(
                http.post("*/api/collections/sub%3D/confirm-verification", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "123",
                collectionId: "789",
                verified: false,
            });

            const result = await service.confirmVerification(token);

            assert.isTrue(result);
            assert.isFalse(service.client.authStore.model?.verified);
        });

        test("Should delete the AuthStore record model matching the token data", async function () {
            const token = await dummyJWT({ id: "123", collectionId: "456" });
            // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInR5cGUiOiJhdXRoUmVjb3JkIiwiY29sbGVjdGlvbklkIjoiNDU2In0.c9ZkXkC8rSqkKlpyx3kXt9ID3qYsIoy1Vz3a2m3ly0c";

            respond(
                http.post("*/api/collections/sub%3D/confirm-email-change", () =>
                    HttpResponse.json({ token }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "123",
                collectionId: "456",
            });

            const result = await service.confirmEmailChange(token, "1234");

            assert.isTrue(result);
            assert.isEmpty(service.client.authStore.token);
        });

        test("Should not delete the AuthStore record model on mismatched token data", async function () {
            const token = await dummyJWT({ id: "f", collectionId: "789" });
            // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInR5cGUiOiJhdXRoUmVjb3JkIiwiY29sbGVjdGlvbklkIjoiNDU2In0.c9ZkXkC8rSqkKlpyx3kXt9ID3qYsIoy1Vz3a2m3ly0c";

            respond(
                http.post("*/api/collections/sub%3D/confirm-email-change", () =>
                    HttpResponse.json({ token, password: "1234" }),
                ),
            );

            service.client.authStore.save(authToken, {
                id: "123",
                collectionId: "789",
            });

            const result = await service.confirmEmailChange(token, "1234");

            assert.isTrue(result);
            assert.isNotEmpty(service.client.authStore.token);
        });
    });

    // ---------------------------------------------------------------
    // auth tests
    // ---------------------------------------------------------------

    function authResponseCheck(
        result: RecordAuthResponse<RecordModel>,
        expectedToken: string,
        expectedRecord: Partial<RecordModel>,
    ) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.deepEqual(result.record, expectedRecord);
        assert.equal(service.client.authStore.token, expectedToken);
        assert.deepEqual(service.client.authStore.model, expectedRecord);
    }

    describe("listAuthMethods()", function () {
        test("Should fetch all available authorization methods", async function () {
            const expectedBody = {
                usernamePassword: true,
                emailPassword: true,
                authProviders: [
                    {
                        name: "test",
                        state: "123",
                        codeVerifier: "v123",
                        codeChallenge: "c123",
                        codeChallengeMethod: "m123",
                        authUrl: "http://example.com",
                    },
                ],
            };

            respond(
                http.get("*/api/collections/sub%3D/auth-methods", () =>
                    HttpResponse.json(expectedBody),
                ),
            );

            const result = await service.listAuthMethods({
                q1: 123,
                headers: { "x-test": "456" },
            });

            assert.deepEqual(result, expectedBody);
        });
    });

    describe("authWithPassword()", function () {
        test("Should authenticate a record by its username/email and password", async function () {
            respond(
                http.post("*/api/collections/sub%3D/auth-with-password", () =>
                    HttpResponse.json({ token: authToken, record: { id: "id_auth" } }),
                ),
            );
            const result = await service.authWithPassword("test@example.com", "123456", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            authResponseCheck(result, authToken, { id: "id_auth" });
        });
    });

    describe("authWithOAuth2Code()", function () {
        test("Should authenticate with OAuth2 a record by an OAuth2 code", async function () {
            respond(
                http.post("*/api/collections/sub%3D/auth-with-oauth2", () =>
                    HttpResponse.json({ token: authToken, record: { id: "id_auth" } }),
                ),
            );

            const result = await service.authWithOAuth2Code(
                "test",
                "c123",
                "v123",
                "http://example.com",
                { test: 1 },
                {
                    q1: 456,
                    headers: { "x-test": "789" },
                },
            );

            authResponseCheck(result, authToken, { id: "id_auth" });
        });
    });

    // @todo consider adding a test for the realtime version when refactoring the realtime service
    // describe("authWithOAuth2()", function () {
    // });

    describe("authRefresh()", function () {
        test("Should refresh an authorized record instance", async function () {
            respond(
                http.get("*/api/collections/sub%3D/auth-refresh", () =>
                    HttpResponse.json({
                        token: authToken,
                        record: { id: "id_refresh" },
                    }),
                ),
            );

            const result = await service.authRefresh({
                q1: 456,
                headers: { "x-test": "789" },
            });

            authResponseCheck(result, authToken, { id: "id_refresh" });
        });
    });

    describe("confirmPasswordReset()", function () {
        test("Should confirm a password reset request (1)", async function () {
            respond(
                http.post("*/api/collections/sub%3D/confirm-password-reset", () =>
                    HttpResponse.json(
                        {
                            authToken,
                            password: "123",
                            passwordConfirm: "456",
                        },
                        { status: 200 },
                    ),
                ),
            );

            const result = await service.confirmPasswordReset("test", "123", "456", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("requestVerification()", function () {
        test("Should send a password reset request", async function () {
            respond(
                http.post("*/api/collections/sub%3D/request-verification", () =>
                    HttpResponse.json({ email: "test@example.com" }),
                ),
            );

            const result = await service.requestVerification("test@example.com", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("confirmVerification()", function () {
        test("Should confirm a password reset request (3)", async function () {
            respond(
                http.post("*/api/collections/sub%3D/confirm-verification", () =>
                    HttpResponse.json({ token: authToken }),
                ),
            );

            const result = await service.confirmVerification(authToken, {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("requestEmailChange()", function () {
        test("Should send an email change request", async function () {
            respond(
                http.post("*/api/collections/sub%3D/request-email-change", () =>
                    HttpResponse.json({ body: { newEmail: "test@example.com" } }),
                ),
            );

            const result = await service.requestEmailChange("test@example.com", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("confirmEmailChange()", function () {
        test("Should confirm an email change request", async function () {
            const token = await dummyJWT({ id: "test", collection: "abc" });
            respond(
                http.post("*/api/collections/sub%3D/confirm-email-change", () =>
                    HttpResponse.json({ token, password: "1234" }),
                ),
            );

            const result = await service.confirmEmailChange(token, "1234", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("listExternalAuths()", function () {
        test("Should send a list external auths request", async function () {
            respond(
                http.get(
                    "*/api/collections/sub%3D/records/%40test_id/external-auths",
                    () =>
                        HttpResponse.json([
                            { id: "1", provider: "google" },
                            { id: "2", provider: "github" },
                        ]),
                ),
            );

            const result = await service.listExternalAuths("@test_id", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.equal(result.length, 2);
            assert.equal(result[0].provider, "google");
            assert.equal(result[1].provider, "github");
        });
    });

    describe("unlinkExternalAuth()", function () {
        test("Should send a unlinkExternalAuth request", async function () {
            respond(
                http.delete(
                    "*/api/collections/sub%3D/records/%40test_id/external-auths/%40test_provider*",
                    () => HttpResponse.json({ status: 204 }),
                ),
            );

            const result = await service.unlinkExternalAuth(
                "@test_id",
                "@test_provider",
                {
                    q1: 456,
                    headers: { "x-test": "789" },
                },
            );

            assert.isTrue(result);
        });
    });
});
