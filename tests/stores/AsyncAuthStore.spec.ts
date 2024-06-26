import { describe, assert, expect, test, vi } from "vitest";
import { AsyncAuthStore } from "@/stores/AsyncAuthStore";
import { dummyJWT } from "../setup";

describe("AsyncAuthStore", async function () {
    const validToken = await dummyJWT({ id: "test" });
    describe("construct()", function () {
        test("load empty initial", async function () {
            const saveSpy = vi.fn();

            const store = new AsyncAuthStore({
                save: saveSpy,
            });

            assert.equal(store.token, "");
            assert.equal(store.model, null);
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(saveSpy).toHaveBeenCalledTimes(0);
        });

        test.each([
            ["string", `{"token": "${validToken}", "model": {"id": "id1"}}`],
            [
                "Promise<string>",
                Promise.resolve(`{"token": "${validToken}", "model": {"id": "id1"}}`),
            ],
            [
                "Promise<object>",
                Promise.resolve({ token: validToken, model: { id: "id1" } }),
            ],
        ])(`load initial from %s`, async (_description, initial) => {
            const saveSpy = vi.fn();

            const store = new AsyncAuthStore({
                save: saveSpy,
                initial,
            });

            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(saveSpy).toHaveBeenCalledTimes(1);

            assert.equal(store.token, validToken);
            assert.deepEqual(store.model, { id: "id1" });
        });
    });

    describe("save()", function () {
        test("trigger saveFunc", async function () {
            const saveSpy = vi.fn();

            const store = new AsyncAuthStore({ save: saveSpy });

            await store.save(validToken, { id: "id1" });
            assert.equal(store.token, validToken);
            assert.deepEqual(store.model, { id: "id1" });

            // update
            await store.save(validToken, { id: "id2" });
            assert.equal(store.token, validToken);
            assert.deepEqual(store.model, { id: "id2" });

            expect(saveSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe("clear()", function () {
        test("no explicit clearFunc", async function () {
            const saveSpy = vi.fn();

            const store = new AsyncAuthStore({ save: saveSpy });

            await store.save(validToken, { id: "id1" });
            assert.equal(store.token, validToken);
            assert.deepEqual(store.model, { id: "id1" });

            await store.clear();
            assert.equal(store.token, "");
            assert.deepEqual(store.model, null);

            expect(saveSpy).toHaveBeenCalledTimes(2);
        });

        test("with explicit clearFunc", async function () {
            const saveSpy = vi.fn();
            const clearSpy = vi.fn();

            const store = new AsyncAuthStore({
                save: saveSpy,
                clear: clearSpy,
            });

            await store.save(validToken, { id: "id1" });
            assert.equal(store.token, validToken);
            assert.deepEqual(store.model, { id: "id1" });

            await store.clear();
            assert.equal(store.token, "");
            assert.deepEqual(store.model, null);

            expect(saveSpy).toHaveBeenCalledTimes(1);
            expect(clearSpy).toHaveBeenCalledTimes(1);
        });
    });
});
