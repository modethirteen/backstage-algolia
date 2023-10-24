import { SearchProxyRequest } from 'backstage-plugin-algolia-common';
import { createApiRef } from '@backstage/core-plugin-api';
import { InsightsEvent, InsightsMethod } from 'instantsearch.js';
import { MultipleQueriesResponse } from '@algolia/client-search';
import { SearchApi } from '@backstage/plugin-search-react';

export const searchProxyApiRef = createApiRef<SearchProxyApi>({
  id: 'plugin.algolia.service',
});

export interface SearchProxyApi extends SearchApi {
  search(
    request: SearchProxyRequest,
    options?: {
      skipEmptyQueries?: boolean;
    },
  ): Readonly<Promise<MultipleQueriesResponse<any>>>;
  sendInsightsEvent(
    event: InsightsEvent<InsightsMethod>,
    options?: {
      userToken?: string;
      authenticatedUserToken?: string;
    },
  ): Promise<Response>;
}
