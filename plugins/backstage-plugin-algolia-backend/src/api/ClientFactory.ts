import { Config } from '@backstage/config';
import algoliasearch, { AlgoliaSearchOptions, SearchClient } from 'algoliasearch';
import insights, { InsightsClient } from 'search-insights';

export interface ClientFactoryInterface {
  newSearchClient(options?: AlgoliaSearchOptions): SearchClient;
  newInsightsClient(): InsightsClient;
}

export class ClientFactory implements ClientFactoryInterface {
  public static fromConfig(config: Config) {
    const apikey = config.getString('algolia.backend.apikey');
    const applicationId = config.getString('algolia.backend.applicationId');
    return new ClientFactory({ apikey, applicationId });
  }

  private readonly apikey: string;
  private readonly applicationId: string;

  public constructor(deps: {
    apikey: string;
    applicationId: string;
  }) {
    const { apikey, applicationId } = deps;
    this.apikey = apikey;
    this.applicationId = applicationId;
  }

  public newSearchClient(options?: AlgoliaSearchOptions) {
    return algoliasearch(this.applicationId, this.apikey, options);
  }

  public newInsightsClient() {
    insights('init', { appId: this.applicationId, apiKey: this.apikey });
    return insights;
  }
}
