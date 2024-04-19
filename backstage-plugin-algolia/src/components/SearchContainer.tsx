import {
  configApiRef,
  useApi
} from '@backstage/core-plugin-api';
import { InsightsEvent, InsightsMethod } from 'instantsearch.js';
import { InsightsProps } from 'instantsearch.js/es/middlewares';
import React, {
  ReactNode,
  createContext,
  useState,
} from 'react';
import {
  InstantSearch,
  InstantSearchProps,
} from 'react-instantsearch';
import { Config } from '../../config';
import { backendInsightsApiRef } from '../api';

export const AlgoliaQueryIdContext = createContext({
  queryId: '',
  setQueryId: (_: string) => {},
});

export const SearchContainer = (props: {
  children: ReactNode;
  userToken?: string;
  authenticatedUserToken?: string;
} & InstantSearchProps) => {
  const {
    children,
    authenticatedUserToken,
    userToken,
    ...rest
  } = props;

  // allow SearchHitList to share query id with companion search components
  const [queryId, setQueryId] = useState('');
  const queryIdProvider = { queryId, setQueryId };
  const config = useApi(configApiRef);
  const api = useApi(backendInsightsApiRef);
  let insights: InsightsProps | boolean;
  switch (config.getOptional<Config['algolia']['insights']>('algolia.insights') ?? 'none') {
    case 'backend':
      insights = {
        insightsClient: null,
        onEvent: (event: InsightsEvent<InsightsMethod>) => {
          api.sendEvent({ event, authenticatedUserToken, userToken });
        },
      };
      break;
    case 'frontend':
      insights = true;
      break;
    default:
    case 'none':
      insights = false;
  }
  return (
    <AlgoliaQueryIdContext.Provider value={queryIdProvider}>
      <InstantSearch
        {...rest}
        insights={insights}
      >
        {children}
      </InstantSearch>
    </AlgoliaQueryIdContext.Provider>
  )
};
