import { configApiRef, useAnalytics, useApi } from '@backstage/core-plugin-api';
import { InsightsEvent, InsightsMethod } from 'instantsearch.js';
import { InsightsProps } from 'instantsearch.js/es/middlewares';
import React, { ReactNode, useEffect } from 'react';
import { InstantSearch, InstantSearchProps, useStats } from 'react-instantsearch';
import { Config } from '../../config';
import { backendInsightsApiRef } from '../api';

const SearchAnalytics = () => {
  const stats = useStats();
  const analytics = useAnalytics();
  const { query, nbHits } = stats;
  useEffect(() => {
    if (query) {
      analytics.captureEvent('search', query, {
        value: nbHits,
        attributes: {
          pluginId: 'algolia',
          extension: 'SearchContainer',
        },
      });
    }
  }, [query]);
  return null;
};

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
    <InstantSearch
      {...rest}
      insights={insights}
    >
      <SearchAnalytics />
      {children}
    </InstantSearch>
  )
};
