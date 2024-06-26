import { describe, assert, test, expect, vi } from "vitest";
import { getTokenPayload, isTokenExpired } from "@/stores/utils/jwt";
import { beforeEach } from "node:test";
import { dummyJWT, manualDummyJWT } from "../../setup";

const mocks = vi.hoisted(() => ({ getTokenPayload: vi.fn() }));

vi.mock("@/stores/utils/jwt", async () => {
    const jwt =
        await vi.importActual<typeof import("@/stores/utils/jwt")>("@/stores/utils/jwt");
    return {
        ...jwt,
        getTokenPayload: mocks.getTokenPayload.mockImplementation(jwt.getTokenPayload),
    };
});

describe("jwt", function () {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2000, 1, 1, 13));
    });
    describe("getTokenPayload()", function () {
        test("Should extract JWT payload without validation", function () {
            const token =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjN9.da77dJt5jjPU43vaaCr6WeHEXrxzB37b0edfjwyD-2M";

            const payload = getTokenPayload(token);

            assert.deepEqual(payload, { test: 123 });
        });

        test("Should throw an error on invalid JWT string", function () {
            const testCases = ["", "abc", "a.b.c"];
            for (const i in testCases) {
                const test = testCases[i];
                expect(() => getTokenPayload(test)).toThrowError();
            }
        });
    });
    //("Should successfully verify that a JWT token is expired or not", function () {
    describe("isTokenExpired()", async () => {
        test("errors on invalid JWT", () => {
            expect(() => isTokenExpired("invalid JWT")).toThrow();
        });
        test("token without exp param", async () => {
            const token = await manualDummyJWT({ test: 123 });
            expect(() => isTokenExpired(token)).toThrowError();
        });
        test.each([
            [false, "token with empty payload", await dummyJWT({})],
            [
                true,
                "token with exp param in the past",
                await dummyJWT(
                    {
                        test: 123,
                    },
                    { exp: "-2h" },
                ),
            ],
            [
                false,
                "token with exp param in the future",
                await dummyJWT(
                    {
                        test: 123,
                    },
                    { exp: "22h" },
                ),
            ],
        ])("is expired: %o for %s", (expired, _description, token) => {
            expect(isTokenExpired(token)).toEqual(expired);
        });
    });
});
