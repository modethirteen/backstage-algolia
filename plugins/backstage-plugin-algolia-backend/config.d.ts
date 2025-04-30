export interface Config {
  algolia: {
    backend: {
      /**
       * @visibility secret
       */
      apikey: string;
      applicationId: string;
      indexes: {
        catalog?: {
          name: string;

          // max age of records since last index before cleanup in ISO8601 duration format
          expirations?: {
            type: string;
            ttl: string;
          }[];
          kinds?: string[];
          locationTemplate?: string;
          parallelismLimit?: number;
        };
        techdocs?: {
          name: string;

          // max age of records since last index before cleanup in ISO8601 duration format
          expirations?: {
            type: string;
            ttl: string;
          }[];
          locationTemplate?: string;
          parallelismLimit?: number;
        };
        [key: string]: {
          name: string;

          // max age of records since last index before cleanup in ISO8601 duration format
          expirations?: {
            type: string;
            ttl: string;
          }[];
        };
      };
      maxObjectSizeBytes?: number;
      chunk?: boolean;
    };
  };
}
