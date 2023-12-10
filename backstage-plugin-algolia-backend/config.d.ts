export interface Config {
  algolia: {
    backend: {
      
      /**
       * @visibility secret
       */
      apikey: string;
      applicationId: string;
      indexes: {
        catalog: {
          name: string;
          kinds?: string[];
          locationTemplate?: string;
          parallelismLimit?: number;

          // max age of records since last index before cleanup in ISO8601 duration format
          expirations?: {
            source: string;
            ttl: string;
          }[];
        };
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
      chunk: boolean;
    };
  };
}
