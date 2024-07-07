import { setupServer as mswSetupServer } from 'msw/node';

export function setupServer() {
  return mswSetupServer();
}
