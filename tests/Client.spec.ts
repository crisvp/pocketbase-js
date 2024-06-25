import { describe, assert, expect, test, beforeAll, afterAll, vi } from "vitest";
import Client from "@/Client";
import { LocalAuthStore } from "@/stores/LocalAuthStore";
import { RecordService } from "@/services/RecordService";
import { RecordModel } from "@/services/utils/dtos";
import { serialize } from "object-to-formdata";
import { it } from "node:test";

describe("Client", function () {
    const client = new Client("http://test.host", null, "test_language");

    // beforeAll(function () {
    //     server.listen({ onUnhandledRequest: "error" });
    // });

    // afterEach(function () {
    //     fetchMock.clearMocks();
    // });

    describe("constructor()", function () {
        test("Should create a properly configured http client instance", function () {
            assert.equal(client.baseUrl, "http://test.host");
            assert.instanceOf(client.authStore, LocalAuthStore);
            assert.equal(client.lang, "test_language");
        });

        test("Should load all api resources", async function () {
            const baseServices: (keyof Client)[] = [
                "admins",
                "collections",
                "logs",
                "settings",
                "realtime",
            ];

            for (const service of baseServices) {
                assert.isNotEmpty(client[service]);
            }
        });
    });

    describe("collection()", function () {
        test("Should initialize the related collection record service", function () {
            const service1 = client.collection("test1");
            const service2 = client.collection("test2");
            const service3 = client.collection("test1"); // same as service1

            assert.instanceOf(service1, RecordService);
            assert.instanceOf(service2, RecordService);
            assert.instanceOf(service3, RecordService);
            assert.equal(service1, service3);
            assert.notEqual(service1, service2);
            assert.equal(service1.baseCrudPath, "/api/collections/test1/records");
            assert.equal(service2.baseCrudPath, "/api/collections/test2/records");
            assert.equal(service3.baseCrudPath, "/api/collections/test1/records");
        });
    });

    describe("buildUrl()", function () {
        test("Should properly concatenate path to baseUrl", function () {
            // with trailing slash
            const client1 = new Client("test_base_url/");
            assert.equal(client1.buildUrl("test123"), "test_base_url/test123");
            assert.equal(client1.buildUrl("/test123"), "test_base_url/test123");

            // no trailing slash
            const client2 = new Client("test_base_url");
            assert.equal(client2.buildUrl("test123"), "test_base_url/test123");
            assert.equal(client2.buildUrl("/test123"), "test_base_url/test123");
        });

        test("Should construct an absolute url if window.location is defined", function () {
            Object.assign(global, {
                window: {
                    location: {
                        origin: "https://example.com/",
                        pathname: "/sub",
                    },
                },
            });

            // with empty base url
            {
                const client = new Client("");
                assert.equal(
                    client.buildUrl("test123"),
                    "https://example.com/sub/test123",
                );
                assert.equal(
                    client.buildUrl("/test123"),
                    "https://example.com/sub/test123",
                );
            }

            // relative base url with starting slash
            {
                const client = new Client("/a/b/");
                assert.equal(
                    client.buildUrl("test123"),
                    "https://example.com/a/b/test123",
                );
                assert.equal(
                    client.buildUrl("/test123"),
                    "https://example.com/a/b/test123",
                );
            }

            // relative base url with parent path traversal
            {
                const client = new Client("../a/b/");
                assert.equal(
                    client.buildUrl("test123"),
                    "https://example.com/sub/../a/b/test123",
                );
                assert.equal(
                    client.buildUrl("/test123"),
                    "https://example.com/sub/../a/b/test123",
                );
            }

            // relative base url without starting slash
            {
                const client = new Client("a/b/");
                assert.equal(
                    client.buildUrl("test123"),
                    "https://example.com/sub/a/b/test123",
                );
                assert.equal(
                    client.buildUrl("/test123"),
                    "https://example.com/sub/a/b/test123",
                );
            }

            // with explicit HTTP absolute base url
            {
                const client = new Client("http://example2.com");
                assert.equal(client.buildUrl("test123"), "http://example2.com/test123");
                assert.equal(client.buildUrl("/test123"), "http://example2.com/test123");
            }

            // with explicit HTTPS absolute base url and trailing slash
            {
                const client = new Client("https://example2.com/");
                assert.equal(client.buildUrl("test123"), "https://example2.com/test123");
                assert.equal(client.buildUrl("/test123"), "https://example2.com/test123");
            }
        });
    });

    describe("getFileUrl()", function () {
        const client = new Client("test_base_url");
        const record: RecordModel = {
            id: "456",
            collectionId: "123",
            collectionName: "789",
            created: new Date().toString(),
            updated: new Date().toString(),
        };

        test("Should return a formatted url", async function () {
            const result = client.getFileUrl(record, "demo.png");

            expect(result).toMatch(/\/api\/files\/123\/456\/demo.png$/);
        });

        test("Should return a formatted url + query params", async function () {
            const result = client.getFileUrl(record, "demo=", { test: "abc" });

            expect(result).toMatch(/\/api\/files\/123\/456\/demo%3D\?test=abc$/);
        });
    });

    describe("filter()", function () {
        test("filter expression without params", function () {
            const client = new Client("test_base_url", null, "test_language_A");
            const raw = "a > {:test1} && b = {:test2} || c = {:test2}";

            assert.equal(client.filter(raw), raw);
        });

        test("filter expression with params that does not match the placeholders", function () {
            const client = new Client("test_base_url", null, "test_language_A");
            const result = client.filter("a > {:test1} && b = {:test2} || c = {:test2}", {
                test2: "hello",
            });

            assert.equal(result, "a > {:test1} && b = 'hello' || c = 'hello'");
        });

        test("filter expression with all placeholder types", function () {
            const client = new Client("test_base_url", null, "test_language_A");

            const params = {
                test1: "a'b'c'",
                test2: null,
                test3: true,
                test4: false,
                test5: 123,
                test6: -123.45,
                test7: 123.45,
                test8: new Date("2023-10-18 07:11:12Z"),
                test9: [1, 2, 3, "test'123"],
                test10: { a: "test'123" },
            };

            let raw = "";
            for (const key in params) {
                if (raw) {
                    raw += " || ";
                }
                raw += `${key}={:${key}}`;
            }

            assert.equal(
                client.filter(raw, params),
                `test1='a\\'b\\'c\\'' || test2=null || test3=true || test4=false || test5=123 || test6=-123.45 || test7=123.45 || test8='2023-10-18 07:11:12.000Z' || test9='[1,2,3,"test\\'123"]' || test10='{"a":"test\\'123"}'`,
            );
        });
    });

    describe("send()", function () {
        test("Should build and send http request", async function () {
            const client = new Client("http://test.host/", null, "test_language_A");

            const formData = serialize({
                title: "test",
                roles: ["a", "b"],
                json: null,
                files: [new Blob(["11"]), new Blob(["2"])],
            });
            expect(formData).toBeInstanceOf(FormData);
            if (!(formData instanceof FormData)) console.log("fff", formData);

            const testCases = [
                [client.send("/123", { method: "GET" }), "successGet"],
                [client.send("/123", { method: "POST" }), "successPost"],
                [client.send("/123", { method: "PUT" }), "successPut"],
                [client.send("/123", { method: "PATCH" }), "successPatch"],
                [client.send("/123", { method: "DELETE" }), "successDelete"],
                [
                    client.send("/multipart", {
                        method: "POST",
                        body: new FormData(),
                    }),
                    "successMultipart",
                ],
                [
                    client.send("/multipartAuto", {
                        method: "POST",
                        body: formData,
                    }),
                    "successMultipartAuto",
                ],
            ];
            for (const testCase of testCases) {
                const responseData = await testCase[0];
                assert.equal(responseData, testCase[1]);
            }
        });

        it("should send empty header when no token is set", async () => {
            const client = new Client("http://test.host", null, "test_language_A");
            expect(client.authStore.isValid).toBe(false);
            const response = await client.send("/unauthenticated", { method: "GET" });
            expect(response).toEqual("successAuth");
        });

        it("adds authentication header for admin", async () => {
            const client = new Client("http://test.host", null, "test_language_A");
            const admin = { id: "test-admin" };
            client.authStore.save("token123", admin);
            const response = await client.send("/admin", { method: "GET" });
            expect(response).toEqual("successAuth");
        });

        it("adds authentication header for user", async () => {
            const client = new Client("http://test.host", null, "test_language_A");
            const user = { id: "test-user", collectionId: "test-user" };
            client.authStore.save("token123", user);
            const response = await client.send("/user", { method: "GET" });
            expect(response).toEqual("successAuth");
        });

        test("Should use a custom fetch function", async function () {
            const fetchSpy = vi.fn(async () => new Response('"customFetch"'));

            const response = await client.send("/old", {
                q1: 123,
                method: "GET",
                fetch: fetchSpy,
            });

            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(response).toEqual("customFetch");
        });

        test("Should trigger the before hook", async function () {
            const newUrl = "http://test.host/new";

            client.beforeSend = function (_, options) {
                options.headers = Object.assign({}, options.headers, {
                    "X-Custom-Header": "456",
                });

                return { url: newUrl, options };
            };

            const response = await client.send("/old", { method: "GET" });
            expect(response).toEqual("successNew");
        });

        test("Should trigger the async before hook", async function () {
            const client = new Client("http://test.host");
            const newUrl = "http://test.host/new";

            client.beforeSend = function (_, options) {
                options.headers = Object.assign({}, options.headers, {
                    "X-Custom-Header": "456",
                });

                return new Promise((resolve) => {
                    setTimeout(() => resolve({ url: newUrl, options }), 10);
                });
            };

            const response = await client.send("/old", { method: "GET" });
            expect(response).toEqual("successNew");
        });

        test("Should trigger the after hook", async function () {
            const client = new Client("http://test.host");
            const afterSendSpy = vi.fn();

            client.afterSend = afterSendSpy;

            afterSendSpy.mockReturnValueOnce("success");
            const responseSuccess = await client.send("/success", { method: "GET" });
            expect(responseSuccess).toEqual("success");

            afterSendSpy.mockRejectedValueOnce("failure");
            const responseFailure = client.send("/success", { method: "GET" });
            await expect(responseFailure).rejects.toThrow();

            expect(afterSendSpy).toHaveBeenCalledTimes(2);
        });

        test("Should trigger the async after hook", async function () {
            const client = new Client("http://test.host");

            const afterSendSpy = vi.fn();
            client.afterSend = afterSendSpy;

            afterSendSpy.mockResolvedValueOnce("success");
            const response = client.send("/success", { method: "GET" });
            expect(response).resolves.toEqual("success");
            await new Promise((resolve) => setTimeout(resolve, 0));

            afterSendSpy.mockRejectedValueOnce("failure");
            const reject = client.send("/success", { method: "GET" });
            expect(reject).rejects.toThrow();
        });
    });

    describe("cancelRequest()", function () {
        test("Should cancel pending request", async function () {
            const client = new Client("http://test.host");

            const response = client.send("/slow", {
                method: "GET",
                params: { $cancelKey: "testKey" },
            });

            client.cancelRequest("testKey");

            await expect(response).rejects.toThrow();
        });
    });

    describe("cancelAllRequests()", function () {
        test("Should cancel all pending requests", async function () {
            const client = new Client("http://test.host");

            const requestA = client.send("/slow-1", { method: "GET" });
            const requestB = client.send("/slow-2", { method: "GET" });

            client.cancelAllRequests();

            await expect(requestA).rejects.toThrow();
            await expect(requestB).rejects.toThrow();
        });
    });

    describe("auto cancellation", function () {
        test("Should disable auto cancellation", async function () {
            const client = new Client("http://test.host");

            client.autoCancellation(false);

            const requestA = client.send("/slow-1", { method: "GET" });
            const requestB = client.send("/slow-1", { method: "GET" });

            await expect(requestA).resolves.toBeDefined();
            await expect(requestB).resolves.toBeDefined();
        });

        test("Should auto cancel duplicated requests with default key", async function () {
            const client = new Client("http://test.host");

            const requestA = client.send("/slow-1", { method: "GET" });
            const requestB = client.send("/slow-1", { method: "GET" });
            const requestC = client.send("/slow-1", { method: "GET" });

            await expect(requestA).rejects.toThrow();
            await expect(requestB).rejects.toThrow();
            await expect(requestC).resolves.toBeDefined();
        });

        test("Should auto cancel duplicated requests with custom key", async function () {
            const client = new Client("http://test.host");

            const requestA = client.send("/slow-1", {
                method: "GET",
                requestKey: "customKey",
            });
            const requestB = client.send("/slow-1", {
                method: "GET",
                requestKey: "customKey",
            });
            const requestC = client.send("/slow-1", { method: "GET" });

            await expect(requestA).rejects.toThrow();
            await expect(requestB).resolves.toBeDefined();
            await expect(requestC).resolves.toBeDefined();
        });

        test("(legacy) Should skip auto cancellation", async function () {
            const client = new Client("http://test.host");

            const requestA = client.send("/slow-1", {
                method: "GET",
                params: { $autoCancel: false },
            });
            const requestB = client.send("/slow-1", {
                method: "GET",
                params: { $autoCancel: false },
            });
            const requestC = client.send("/slow-1", {
                method: "GET",
                params: { $autoCancel: false },
            });

            await expect(requestA).resolves.toBeDefined();
            await expect(requestB).resolves.toBeDefined();
            await expect(requestC).resolves.toBeDefined();
        });

        test("Should skip auto cancellation", async function () {
            const client = new Client("http://test.host");

            const requestA = client.send("/slow-1", {
                method: "GET",
                requestKey: null,
            });
            const requestB = client.send("/slow-1", {
                method: "GET",
                requestKey: null,
            });
            const requestC = client.send("/slow-1", {
                method: "GET",
                requestKey: null,
            });

            await expect(requestA).resolves.toBeDefined();
            await expect(requestB).resolves.toBeDefined();
            await expect(requestC).resolves.toBeDefined();
        });
    });
});
