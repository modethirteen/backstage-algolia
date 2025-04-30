interface IndexConfig {
  name: string;

  // max age of records since last index before cleanup in ISO8601 duration format
  expirations?: {
    source: string;
    ttl: string;
  }[];
}

export interface Config {
  algolia: {
    backend: {
      /**
       * @visibility secret
       */
      apikey: string;
      applicationId: string;
      indexes: {
        catalog?: IndexConfig & {
          kinds?: string[];
          locationTemplate?: string;
          parallelismLimit?: number;
        };
        techdocs?: IndexConfig & {
          locationTemplate?: string;
          parallelismLimit?: number;
        };
        [key: string]: IndexConfig;
      };
      maxObjectSizeBytes: number;
      chunk: boolean;
    };
  };
}
