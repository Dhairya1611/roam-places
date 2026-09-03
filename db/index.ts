import { env } from 'cloudflare:workers';

export function getDatabase() {
  if (!env.DB) {
    throw new Error('The Roam database is not available.');
  }
  return env.DB;
}
