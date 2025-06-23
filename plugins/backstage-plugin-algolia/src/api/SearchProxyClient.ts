import { ResponseError } from '@backstage/errors';
import { SearchProxyApi } from './SearchProxyApi';
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import {
  IndexObjectWithIdAndTimestamp,
  InsightsProxyRequest,
  SearchProxyRequest,
} from 'backstage-plugin-algolia-common';
import { InsightsEvent, InsightsMethod } from 'instantsearch.js';
import { SearchQuery, SearchResultSet } from '@backstage/plugin-search-common';
import {
  MultipleQueriesResponse,
  SearchResponse,
} from '@algolia/client-search';
import { Config } from '@backstage/config';

export class SearchProxyClient implements SearchProxyApi {
  private readonly config: Config;
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  public constructor(deps: {
    config: Config;
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
  }) {
    const { config, discoveryApi, fetchApi } = deps;
    this.config = config;
    this.discoveryApi = discoveryApi;
    this.fetchApi = fetchApi;
  }

  public async query(query: SearchQuery) {
    const { filters, term, types } = query;
    const indexName = this.config.get('algolia.index');
    const facetFilters: string[] = [];
    if (types) {
      facetFilters.push(...types.map(t => `type:${t}`));
    }
    if (filters) {
      for (const [filter, value] of Object.entries(filters)) {
        facetFilters.push(`${filter}:${value}`);
      }
    }
    const { results } = await this.search({
      requests: [
        {
          indexName,
          params: {
            query: term,
            ...(facetFilters.length ? { facetFilters } : {}),
          },
        },
      ],
    });
    return {
      results: (results as SearchResponse<IndexObjectWithIdAndTimestamp>[])
        .map(r =>
          r.hits.map(({ type, title, text, path }) => ({
            type,
            document: {
              title,
              text,
              location: path,
            },
          })),
        )
        .flat(),
    } satisfies SearchResultSet;
  }

  public async search(
    request: SearchProxyRequest,
    options?: {
      skipEmptyQueries?: boolean;
    },
  ): Promise<MultipleQueriesResponse<any>> {
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
    return response.json();
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
