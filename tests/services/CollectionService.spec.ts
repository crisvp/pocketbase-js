import { describe, assert, test, beforeAll, afterAll, afterEach, vi } from "vitest";
import { FetchMock } from "../mocks";
import { crudServiceTestsSuite } from "../suites";
import Client from "@/Client";
import { CollectionService } from "@/services/CollectionService";
import { CollectionModel } from "@/services/utils/dtos";
import { setupServer } from "../fixtures/mockApi";

vi.mock("../mocks");
describe("CollectionService", function () {
    const client = new Client("http://127.0.0.1:8090");
    const service = new CollectionService(client);

    const server = setupServer();
    beforeAll(() => server.listen());
    afterAll(() => server.close());

    crudServiceTestsSuite(service, "/api/collections");

    const fetchMock = new FetchMock();

    beforeAll(function () {
        fetchMock.init();
    });

    afterAll(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();
    });

    describe("import()", function () {
        test("Should send a bulk import collections request", async function () {
            fetchMock.on({
                method: "PUT",
                url: service.client.buildUrl("/api/collections/import?q1=456"),
                body: {
                    collections: [{ id: "id1" }, { id: "id2" }],
                    deleteMissing: true,
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.import(
                [{ id: "id1" }, { id: "id2" }] as Array<CollectionModel>,
                true,
                {
                    q1: 456,
                    headers: { "x-test": "123" },
                },
            );

            assert.deepEqual(result, true);
        });
    });
});
