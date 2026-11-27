import { apiApp } from '../server/app.js';

const handle = (request: Request) => apiApp.fetch(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
