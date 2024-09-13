export interface Config {
  algolia: {

    /**
     * @visibility frontend
     */
    apikey: string;

    /**
     * @visibility frontend
     */
    applicationId: string;

    /**
     * @visibility frontend
     */
    index: string;

    /**
     * Enable Algolia event tracking
     * @visibility frontend
     * @see https://www.algolia.com/doc/guides/building-search-ui/events/react/
     */
    insights?: 'frontend' | 'backend' | 'none';
  };
}
