export interface Config {
  algolia: {
    apikeys: {

      /**
       * @visibility secret
       */
      admin: string;
    };
    applicationId: string;
    indexes: {
      techdocs: {
        name: string;
        locationTemplate?: string;
        parallelismLimit?: number;

        // max age of records since last index before cleanup in ISO8601 duration format
        expirations?: {
          source: string;
          ttl: string;
        }[];
      };
    };
    maxObjectSizeBytes: number;
  };
}
