import { DiscoveryApi, FetchApi, IdentityApi, createApiRef } from '@backstage/core-plugin-api';
import { InsightsEvent, InsightsMethod } from 'instantsearch.js';
import { BackendInsightsApi } from './BackendInsightsApi';

export const backendInsightsApiRef = createApiRef<BackendInsightsApi>({
  id: 'plugin.backstage-algolia.service',
});

export class BackendInsightClient implements BackendInsightsApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;
  private readonly identityApi: IdentityApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi, identityApi: IdentityApi }) {
    const { discoveryApi, fetchApi, identityApi } = options;
    this.discoveryApi = discoveryApi;
    this.fetchApi = fetchApi;
    this.identityApi = identityApi;
  }

  public async sendEvent(data: {
    event: InsightsEvent<InsightsMethod>;
    userToken?: string;
    authenticatedUserToken?: string;
  }): Promise<Response> {
    const { event, userToken, authenticatedUserToken } = data;
    const { insightsMethod, payload } = event;
    const { token } = await this.identityApi.getCredentials();
    const baseUrl = await this.discoveryApi.getBaseUrl('algolia');
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
    };
    return this.fetchApi.fetch(`${baseUrl}/insights`, {
      method: 'POST',
      headers: token ? {
        ...headers,
        Authorization: `Bearer ${token}`,
      } : headers,
      body: JSON.stringify({
        insightsMethod,
        payload,
        userToken,
        authenticatedUserToken,
      }),
    });
  }
}
 