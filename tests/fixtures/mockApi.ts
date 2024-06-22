import { http, HttpResponse, JsonBodyType } from "msw";
import { setupServer as mswSetupServer } from "msw/node";
import { expect } from "vitest";

const restHandlers = [
    http.get("http://*:8090/123", () => HttpResponse.json("successGet")),
    http.post("http://*:8090/123", () => HttpResponse.json("successPost")),
    http.put("http://*:8090/123", () => HttpResponse.json("successPut")),
    http.patch("http://*:8090/123", () => HttpResponse.json("successPatch")),
    http.delete("http://*:8090/123", () => HttpResponse.json("successDelete")),
    http.post("http://*:8090/multipart", () => HttpResponse.json("successMultipart")),
    http.post("http://*:8090/multipartAuto", async ({ request }) => {
        const body = await request.formData();
        console.log("bbb", body);
        const [file1, file2] = body.getAll("files[]");
        if (typeof file1 !== "object" || typeof file2 !== "object")
            throw new Error(`Invalid file type: ${typeof file1}, ${typeof file2}`);

        expect(file1.size).toEqual(2);
        expect(file2.size).toEqual(1);

        return HttpResponse.json("successMultipartAuto");
    }),

    // Authentication tests
    http.get("http://*:8090/unauthenticated", ({ request }) => {
        if (request.headers.get("Authorization") !== undefined)
            return HttpResponse.json("successAuth");
        return HttpResponse.json("unauthorized", { status: 400 });
    }),
    http.get("http://*:8090/admin", ({ request }) => {
        if (request.headers.get("Authorization") === "token123")
            return HttpResponse.json("successAuth");

        return HttpResponse.json("unauthorized", { status: 401 });
    }),
    http.get("http://*:8090/user", ({ request }) => {
        if (request.headers.get("Authorization") === "token123")
            return HttpResponse.json("successAuth");

        return HttpResponse.json("unauthorized", { status: 401 });
    }),

    // Other tests
    http.get("http://*:8090/old", () => HttpResponse.json("successOld")),
    http.get("http://*:8090/new", ({ request }) => {
        expect(request.headers.get("X-Custom-Header")).toEqual("456");
        return HttpResponse.json("successNew");
    }),
    http.get("http://*:8090/success", () => HttpResponse.json("success")),
    http.get("http://*:8090/failure", () =>
        HttpResponse.json("failure", { status: 500 }),
    ),
    http.get(
        "http://*:8090/slow-*",
        () =>
            new Promise<HttpResponse>((resolve) =>
                setTimeout(() => resolve(HttpResponse.json("success")), 0),
            ),
    ),

    // AdminService
    http.get("http://*:8090/api/:collection/abc%3D", () => HttpResponse.json("success")),
    http.patch("http://*:8090/api/:collection/abc%3D", () =>
        HttpResponse.json({ id: "item-update" }),
    ),
    http.get("http://*:8090/api/:collection", ({ request, params }) => {
        const paramResponses = {
            "page=1&perPage=1&skipTotal=1&q1=emptyRequest": {
                page: 1,
                perPage: 1,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item1" }],
            },
            "page=2&perPage=1&skipTotal=1&q1=emptyRequest": {
                page: 2,
                perPage: 1,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item2" }],
            },
            "page=3&perPage=1&skipTotal=1&q1=emptyRequest": {
                page: 3,
                perPage: 1,
                totalItems: -1,
                totalPages: -1,
                items: [],
            },
            "page=1&perPage=2&skipTotal=1&q1=noEmptyRequest": {
                page: 1,
                perPage: 2,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item1" }, { id: "item2" }],
            },
            "page=2&perPage=2&skipTotal=1&q1=noEmptyRequest": {
                page: 2,
                perPage: 2,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item3" }],
            },
            "page=1&perPage=1&q1=abc": {
                page: 1,
                perPage: 1,
                totalItems: 3,
                totalPages: 3,
                items: [{ id: "item1" }, { id: "item2" }],
            },
            "page=2&perPage=1&q1=abc": {
                page: 2,
                perPage: 1,
                totalItems: 3,
                totalPages: 3,
                items: [{ id: "item3" }],
            },
        };
        const urlParams = request.url.split("?")[1];
        let response = urlParams
            ? (paramResponses as Record<string, JsonBodyType>)[urlParams]
            : undefined;

        if (!response && params.collection === "backups") {
            response = [
                {
                    key: "test1",
                    modified: "2023-05-18 10:00:00.123Z",
                    size: 100,
                },
                {
                    key: "test2",
                    modified: "2023-05-18 11:00:00.123Z",
                    size: 200,
                },
            ];
        }

        return HttpResponse.json(
            response ?? {
                page: 1,
                perPage: 10,
                totalItems: 1,
                totalPages: 1,
                items: [{ id: "item" }],
            },
        );
    }),
    http.patch("http://*:8090/api/:collection/test123", () =>
        HttpResponse.json("success"),
    ),
    http.delete("/api/:collection/abc%3D", () =>
        HttpResponse.json({ id: "item-delete" }),
    ),
    http.put("http://*:8090/api/:collection/import", () => HttpResponse.json("success")),

    // backup
    http.put("http://*:8090/api/backups/%40test/restore", () =>
        HttpResponse.json("success"),
    ),
    http.post("http://*:8090/api/backups", () => HttpResponse.json("success")),
    http.post("http://*:8090/api/backups/upload", () => HttpResponse.json("success")),
    http.delete("http://:8090/api/backups/%40test", () => HttpResponse.json("success")),
    http.post("http://:8090/api/backups/%40test/restore", () =>
        HttpResponse.json("Success"),
    ),
];

export function setupServer() {
    return mswSetupServer(...restHandlers);
}
