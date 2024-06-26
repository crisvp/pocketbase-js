import { test as viTest } from 'vitest';

export interface ResponseDefinition {
  url: string;
  method: string;
  status: number;
  body: unknown;
}
export const response: Partial<ResponseDefinition> = {};
export const test = viTest.extend({
  response: async ({ task }, use) => {
    await use(task);
  },
});
