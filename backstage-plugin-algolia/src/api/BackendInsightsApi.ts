import { InsightsEvent, InsightsMethod } from 'instantsearch.js';

export interface BackendInsightsApi {
  sendEvent(data: {
    event: InsightsEvent<InsightsMethod>;
    userToken?: string;
    authenticatedUserToken?: string;
  }): Promise<Response>;
}
