import { APIClient } from '../../core/APIClient.js';

let singleton: APIClient | null = null;

export function useApiClient(): APIClient {
  if (!singleton) singleton = new APIClient();
  return singleton;
}
