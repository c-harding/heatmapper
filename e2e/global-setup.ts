import { rm } from 'fs/promises';

import { SESSIONS_DIR } from './env';

export default async function globalSetup() {
  await rm(SESSIONS_DIR, { recursive: true, force: true });
}
