import { configApiRef, useApi } from '@backstage/core-plugin-api';
import React, { ReactNode, createContext, useMemo, useState } from 'react';
import { InstantSearch, InstantSearchProps } from 'react-instantsearch';
import { searchProxyApiRef } from '../api';
import {
  MultipleQueriesQuery,
  MultipleQueriesResponse,
} from '@algolia/client-search';

export const AlgoliaQueryIdContext = createContext({
  queryId: '',
  setQueryId: (_: string) => {},
});

export const SearchContainer = (
  props: {
    children: ReactNode;
    userToken?: string;
    authenticatedUserToken?: string;
    skipEmptyQueries?: boolean;
  } & Omit<InstantSearchProps, 'indexName' | 'insights' | 'searchClient'>,
) => {
  const {
    children,
    authenticatedUserToken,
    userToken,
    skipEmptyQueries,
    ...rest
  } = props;
  const config = useApi(configApiRef);
  const algolia = useApi(searchProxyApiRef);

  // memoize search client
  const searchClient = useMemo(() => {
    const cache = new Map();
    return {
      // the insights middleware expects the search client to provide an
      // appid and apikey, even if it is proxying requests to a backend
      appId: 'dummy',
      apiKey: 'dummy',
      search: async (requests: MultipleQueriesQuery[]) => {
        const key = `search:${JSON.stringify(requests)}`;
        let response: MultipleQueriesResponse<any> = cache.get(key);
        if (response !== undefined) {
          return response;
        }
        return algolia.search({ requests }, { skipEmptyQueries }).then(r => {
          cache.set(key, r);
          return r;
        });
      },
    };
  }, [skipEmptyQueries]);

  // allow SearchHitList to share query id with companion search components
  const [queryId, setQueryId] = useState('');
  const queryIdProvider = { queryId, setQueryId };
  return (
    <AlgoliaQueryIdContext.Provider value={queryIdProvider}>
      <InstantSearch
        {...rest}
        indexName={config.getString('algolia.index')}
        insights={
          config.getOptionalBoolean('algolia.insights')
            ? {
                insightsClient: null,
                onEvent: event => {
                  algolia.sendInsightsEvent(event, {
                    authenticatedUserToken,
                    userToken,
                  });
                },
              }
            : false
        }
        searchClient={searchClient}
      >
        {children}
      </InstantSearch>
    </AlgoliaQueryIdContext.Provider>
  );
};
