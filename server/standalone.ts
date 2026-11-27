import { serve } from '@hono/node-server';
import { apiApp } from './app.js';
import { getRepository } from './repository.js';

const port = Number(process.env.PORT || 8080);
const { storageMode } = getRepository();

serve(
  {
    fetch: apiApp.fetch,
    port,
  },
  () => {
    console.log(
      `[MengXue API] Listening on http://0.0.0.0:${port}/api (storage: ${storageMode})`
    );
  }
);
