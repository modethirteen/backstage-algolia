import { ResponseError } from '@backstage/errors';
import { SearchProxyApi } from './SearchProxyApi';
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import {
  InsightsProxyRequest,
  SearchProxyRequest,
} from 'backstage-plugin-algolia-common';
import { InsightsEvent, InsightsMethod } from 'instantsearch.js';

export class SearchProxyClient implements SearchProxyApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  public constructor(deps: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    const { discoveryApi, fetchApi } = deps;
    this.discoveryApi = discoveryApi;
    this.fetchApi = fetchApi;
  }

  public async search(
    request: SearchProxyRequest,
    options?: {
      skipEmptyQueries?: boolean;
    },
  ) {
    const { skipEmptyQueries = false } = options ?? {};
    const { requests } = request;
    if (
      skipEmptyQueries &&
      requests.every(({ params }) => !params?.facetQuery && !params?.query)
    ) {
      return Promise.resolve({
        results: requests.map(() => ({
          hits: [],
          nbHits: 0,
          nbPages: 0,
          page: 0,
          processingTimeMS: 0,
          hitsPerPage: 0,
          exhaustiveNbHits: false,
          query: '',
          params: '',
        })),
      });
    }
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      new URL(`${baseUrl}/query`).toString(),
      {
        method: 'POST',
        body: JSON.stringify(request),
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      },
    );
    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }
    return await response.json();
  }

  public async sendInsightsEvent(
    event: InsightsEvent<InsightsMethod>,
    options?: {
      userToken?: string;
      authenticatedUserToken?: string;
    },
  ): Promise<Response> {
    const { userToken, authenticatedUserToken } = options ?? {};
    const { insightsMethod = '', payload } = event;
    const baseUrl = await this.getBaseUrl();
    const body: InsightsProxyRequest = {
      insightsMethod,
      payload,
      userToken,
      authenticatedUserToken,
    };
    return this.fetchApi.fetch(`${baseUrl}/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });
  }

  private async getBaseUrl() {
    return await this.discoveryApi.getBaseUrl('algolia');
  }
}
