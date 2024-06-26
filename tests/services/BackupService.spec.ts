import { describe, assert, test } from "vitest";
import Client from "@/Client";
import { BackupService } from "@/services/BackupService";
import { respond } from "../setup";
import { http, HttpResponse } from "msw";

describe("BackupService", function () {
    const client = new Client("http://test.host");
    const service = new BackupService(client);

    // beforeAll(() => server.listen());
    // afterAll(() => server.close());

    describe("getFullList()", function () {
        test("Should fetch all backups", async function () {
            const replyBody = [
                { key: "test1", size: 100, modified: "2023-05-18 10:00:00.123Z" },
                { key: "test2", size: 200, modified: "2023-05-18 11:00:00.123Z" },
            ];
            respond(http.get("*/api/backups", () => HttpResponse.json(replyBody)));

            const result = await service.getFullList({
                q1: 123,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, replyBody);
        });
    });

    describe("create()", function () {
        test("Should initialize a backup create", async function () {
            respond(http.post("*/api/backups", () => HttpResponse.json({ status: 204 })));

            const result = await service.create("@test", {
                q1: 123,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, true);
        });
    });

    describe("upload()", function () {
        test("Should upload a backup", async function () {
            respond(
                http.post("*/api/backups/upload", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            const result = await service.upload(
                { file: "123" },
                { q1: 123, headers: { "x-test": "123" } },
            );

            assert.deepEqual(result, true);
        });
    });

    describe("delete()", function () {
        test("Should delete a single backup", async function () {
            respond(
                http.delete("*/api/backups/%40test", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            const result = await service.delete("@test", {
                q1: 123,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, true);
        });
    });

    describe("restore()", function () {
        test("Should initialize a backup restore", async function () {
            respond(
                http.post("*/api/backups/%40test/restore", () =>
                    HttpResponse.json({ status: 204 }),
                ),
            );

            const result = await service.restore("@test", {
                q1: 123,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, true);
        });
    });

    describe("getDownloadUrl()", function () {
        test("Should initialize a backup getDownloadUrl", function () {
            const result = service.getDownloadUrl("@token", "@test");

            assert.deepEqual(
                result,
                service.client.buildUrl("/api/backups") + "/%40test?token=%40token",
            );
        });
    });
});
