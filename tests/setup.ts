import { setupServer } from "./fixtures/mockApi";
import { afterAll, afterEach, beforeAll } from "vitest";
import { RequestHandler } from "msw";

export const server = setupServer();
export const respond = (...h: RequestHandler[]) => {
    server.use(...h);
    return server;
};
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
