export interface Config {
  algolia: {

    /**
     * @visibility frontend
     */
    index: string;

    /**
     * @visibility frontend
     */
    insights?: boolean;
  };
}
