import { describe, assert, test, expect, beforeEach } from "vitest";
import Client from "@/Client";
import { FileService } from "@/services/FileService";
import { respond } from "../setup";
import { http, HttpResponse } from "msw";
import { RecordModel } from "@/services/utils/dtos";

describe("FileService", function () {
    const client = new Client("http://test.host");
    const service = new FileService(client);
    const record: RecordModel = {
        id: "123",
        collectionId: "123",
        collectionName: "789",
        created: "2021-01-01",
        updated: "2021-01-01",
    };

    describe("getFileUrl()", function () {
        test("Should return empty string (missing record id)", async function () {
            const recordWithoutId = { ...record };
            recordWithoutId.id = "";
            const result = service.getUrl(recordWithoutId, "demo.png");

            assert.deepEqual(result, "");
        });

        test("Should return empty string (missing filename)", async function () {
            const result = service.getUrl(record, "");

            assert.deepEqual(result, "");
        });

        test("Should return a formatted url", async function () {
            const result = service.getUrl(record, "demo.png");
            expect(result).toEqual("http://test.host/api/files/123/123/demo.png");
        });

        test("Should return a formatted url + query params", async function () {
            const result = service.getUrl(record, "demo=", { test: "abc" });
            expect(result).toEqual("http://test.host/api/files/123/123/demo%3D?test=abc");
        });
    });

    describe("getToken()", function () {
        test("Should send a file token request", async function () {
            respond(
                http.post("*/api/files/token", () => HttpResponse.json({ token: "123" })),
            );

            const result = await service.getToken({
                q1: 123,
                headers: { "x-test": "456" },
            });

            assert.deepEqual(result, "123");
        });
    });
});
