export interface Config {
  algolia: {
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
