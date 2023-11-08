export interface Config {
  algolia: {

    /**
     * @visibility secret
     */
    apikey: string;
    applicationId: string;
    indexes: {
      techdocs: {
        name: string;
        locationTemplate?: string;
        parallelismLimit?: number;
      };
    };
    maxObjectSizeBytes: number;
  };
}
