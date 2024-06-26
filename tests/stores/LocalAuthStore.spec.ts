import { describe, assert, test, vi, expect, beforeAll } from "vitest";
import { LocalAuthStore } from "@/stores/LocalAuthStore";
import { afterEach, beforeEach } from "vitest";
import { dummyJWT } from "../setup";

describe("LocalAuthStore", async () => {
    const systemTime = new Date(2000, 1, 1, 13);
    beforeAll(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(systemTime);
        validToken = await dummyJWT({ id: "test" });
        adminToken = await dummyJWT({ type: "admin", id: "testadmin" });
    });
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(systemTime);
    });

    beforeEach(() => window.localStorage.clear());
    afterEach(() => void vi.clearAllMocks());
    afterEach(() => void vi.useRealTimers());

    let validToken: string;
    let adminToken: string;

    describe("save()", function () {
        test("Should store auth data", function () {
            const store = new LocalAuthStore();

            store.save(validToken, { id: "id1" });
            assert.equal(store.token, validToken);
            assert.deepEqual(store.model, { id: "id1" });

            // update
            store.save(validToken, { id: "id2" });
            assert.equal(store.token, validToken);
            assert.deepEqual(store.model, { id: "id2" });
        });
    });

    describe("clear()", function () {
        test("Should remove all stored auth data", function () {
            const store = new LocalAuthStore();

            store.save(validToken, { id: "id1" });
            assert.equal(store.token, validToken);
            assert.deepEqual(store.model, { id: "id1" });

            store.clear();
            assert.equal(store.token, "");
            assert.deepEqual(store.model, null);
        });
    });

    describe("get token()", function () {
        test("Should extract the stored token value", function () {
            const store = new LocalAuthStore();

            assert.equal(store.token, "");
            store.save(validToken, { id: "1" });
            assert.equal(store.token, validToken);
        });
    });

    describe("get model()", function () {
        test("Should extract the stored model value", function () {
            const store = new LocalAuthStore();

            expect(store.model).toEqual(null);
            store.save(validToken, { id: "1" });
            expect(store.model).toEqual({ id: "1" });
        });
    });

    describe("get isValid()", function () {
        test("Should validate the stored token value", async function () {
            const store = new LocalAuthStore();

            expect(store.isValid).toEqual(false);

            store.save(validToken, { id: "1" });
            expect(store.isValid).toEqual(true);

            const expiredToken = await dummyJWT({ id: "123" }, { exp: "-2h" });
            expect(() => store.save(expiredToken, { id: "1" })).toThrowError(
                "Invalid token",
            );

            store.save(validToken, { id: "1" });
            assert.isTrue(store.isValid, "valid token");
        });
    });

    describe("get isAdmin()", function () {
        test("Should check if the stored token is for admin", function () {
            const store = new LocalAuthStore();

            expect(store.isAdmin).toEqual(false);

            store.save(adminToken, { id: "1" });

            expect(store.isAdmin).toEqual(true);
        });
    });

    describe("get isAuthRecord()", function () {
        test("Should checks if the stored token is for auth record", async function () {
            const store = new LocalAuthStore();
            const authToken = await dummyJWT({ id: "123", type: "authRecord" });

            expect(store.isAuthRecord).toEqual(false);

            store.save(
                authToken,
                { id: "1" },
                // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYXV0aFJlY29yZCIsImV4cCI6MTYyNDc4ODAwMH0.wuEMjDMF0mV_U80bjUEUfnDM6sL2n9yvy0jnU3XZUE8",
            );

            assert.isTrue(store.isAuthRecord, "admin token");
        });
    });

    describe("loadFromCookie()", function () {
        test("Should populate the store with the parsed cookie data", function () {
            const store = new LocalAuthStore();

            const data = {
                token: validToken,
                model: { id: 123 },
            };

            store.loadFromCookie("pb_auth=" + JSON.stringify(data));

            assert.equal(store.token, data.token);
            assert.deepEqual(store.model?.id, data.model?.id);
        });
    });

    describe("exportToCookie()", function () {
        test("Should generate a cookie from the store data (with default options)", function () {
            const store = new LocalAuthStore();
            store.save(validToken, { id: "1" });

            const result = store.exportToCookie();

            assert.equal(
                result,
                `pb_auth=%7B%22token%22%3A%22${validToken}%22%2C%22model%22%3A%7B%22id%22%3A%221%22%7D%7D; Path=/; Expires=Tue, 01 Feb 2000 21:00:00 GMT; HttpOnly; Secure; SameSite=Strict`,
            );
        });

        test("Should generate a cookie from the store data (with custom options)", function () {
            const store = new LocalAuthStore();
            store.save(validToken, {
                id: "1",
                email: "test@example.com",
                collectionId: "test_collection_id",
                verified: true,
                name: "test",
            });

            const result = store.exportToCookie(
                {
                    path: "/a/b/c",
                    expires: new Date("2022-01-01"),
                    httpOnly: true,
                },
                "custom_key",
            );

            assert.equal(
                result,
                `custom_key=%7B%22token%22%3A%22${validToken}%22%2C%22model%22%3A%7B%22id%22%3A%221%22%2C%22email%22%3A%22test%40example.com%22%2C%22collectionId%22%3A%22test_collection_id%22%2C%22verified%22%3Atrue%2C%22name%22%3A%22test%22%7D%7D; Path=/a/b/c; Expires=Sat, 01 Jan 2022 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict`,
            );
        });

        test("Should strip the model data in the generated cookie if exceed 4096", function () {
            const store = new LocalAuthStore();
            store.save(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE",
                {
                    id: "1",
                    email: "test@example.com",
                    collectionId: "test_collection_id",
                    verified: true,
                    name: "a".repeat(4000),
                },
            );

            const result = store.exportToCookie({
                path: "/a/b/c",
                expires: new Date("2022-01-01"),
                httpOnly: true,
            });

            assert.equal(
                result,
                "pb_auth=%7B%22token%22%3A%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE%22%2C%22model%22%3A%7B%22id%22%3A%221%22%2C%22email%22%3A%22test%40example.com%22%2C%22collectionId%22%3A%22test_collection_id%22%2C%22verified%22%3Atrue%7D%7D; Path=/a/b/c; Expires=Sat, 01 Jan 2022 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict",
            );
        });
    });

    describe("onChange()", function () {
        test("Should trigger the onChange() callbacks", function () {
            const store = new LocalAuthStore();

            let callback1Calls = 0;
            let callback2Calls = 0;

            const removal1 = store.onChange(() => {
                callback1Calls++;
            }, true);

            const removal2 = store.onChange(() => {
                callback2Calls++;
            });

            // trigger save() change
            store.save(validToken, { id: "1" });
            assert.equal(callback1Calls, 2); // +1 because of the immediate invocation
            assert.equal(callback2Calls, 1);

            // trigger clear() change
            store.clear();
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 2);

            // remove the second listener (aka. callback1Calls shouldn't be called anymore)
            removal1();

            store.save(validToken, { id: "1" });
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 3);

            // remove the second listener (aka. callback2Calls shouldn't be called anymore)
            removal2();

            store.save(validToken, { id: "1" });
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 3);
        });
    });
});
