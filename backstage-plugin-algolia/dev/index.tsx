import { Content, Page } from '@backstage/core-components';
import { AnalyticsApi, AnalyticsEvent, analyticsApiRef, configApiRef, useApi } from '@backstage/core-plugin-api';
import { createDevApp } from '@backstage/dev-utils';
import { TestApiProvider } from '@backstage/test-utils';
import { Grid, Paper } from '@material-ui/core';
import algoliasearch from 'algoliasearch';
import { InsightsEvent, InsightsMethod } from 'instantsearch.js';
import React, { ReactNode, useMemo } from 'react';
import { BackendInsightsApi, backendInsightsApiRef } from '../src/api';
import {
  ClearRefinementsButton,
  HierarchalSearchRefinement,
  SearchBar,
  SearchBreadcrumb,
  SearchContainer,
  SearchHitList,
  SearchRefinement,
  algoliaPlugin,
} from '../src/plugin';

class MockBackendInsightClient implements BackendInsightsApi {
  sendEvent(data: { event: InsightsEvent<InsightsMethod>; userToken?: string | undefined; }): Promise<Response> {
    const { event, userToken } = data;
    console.log({ event, userToken });
    return Promise.resolve({} as Response);
  }
}

class MockAnalytics implements AnalyticsApi {
  public captureEvent(event: AnalyticsEvent): void {
    console.log({ event });
  }
}

const SearchWrapper = (props: {
  children: ReactNode;
}) => {
  const { children } = props;
  const config = useApi(configApiRef);
  const applicationId = config.getString('algolia.applicationId');
  const apikey = config.getString('algolia.apikey');
  const indexName = config.getString('algolia.indexes.techdocs.name');
  const searchClient = useMemo(() =>
    algoliasearch(applicationId, apikey),
    [applicationId, apikey]
  );
  return (
    <SearchContainer
      searchClient={searchClient}
      indexName={indexName}
      future={{
        preserveSharedStateOnUnmount: true,
      }}
      authenticatedUserToken="user-dev"
      userToken="anonymous-dev"
    >
      {children}
    </SearchContainer>
  )
};

createDevApp()
  .registerPlugin(algoliaPlugin)
  .addPage({
    element: (
      <Page themeId="tool">
        <Content>
          <Grid container direction="row">
            <TestApiProvider apis={[
              [analyticsApiRef, new MockAnalytics()],
              [backendInsightsApiRef, new MockBackendInsightClient()]
            ]}>
              <SearchWrapper>
                <Grid item xs={12}>
                  <SearchBreadcrumb
                    attributes={[
                      'domains.level0',
                      'domains.level1',
                      'domains.level2',
                      'domains.level3',
                    ]}
                  />
                  <SearchBar />
                </Grid>
                <Grid item lg={3} md={4} sm={12} xs={12}>
                  <ClearRefinementsButton label="Clear" />
                  <Paper>
                    <SearchRefinement label="Source" attribute="source" />
                  </Paper>
                  <Paper>
                    <HierarchalSearchRefinement
                      attributes={[
                        'domains.level0',
                        'domains.level1',
                        'domains.level2',
                        'domains.level3',
                      ]}
                      label="Domains"
                    />
                  </Paper>
                </Grid>
                <Grid item lg={9} md={8} sm={12} xs={12}>
                  <SearchHitList />
                </Grid>
              </SearchWrapper>
            </TestApiProvider>
          </Grid>
        </Content>
      </Page>
    ),
    title: 'Search with Mocked Backend Insights and Analytics',
    path: '/search-mocked-backend-insights-analytics',
  })
  .addPage({
    element: (
      <Page themeId="tool">
        <Content>
          <Grid container direction="row">
            <SearchWrapper>
              <Grid item xs={12}>
                <SearchBar />
              </Grid>
              <Grid item xs={12}>
                <SearchHitList />
              </Grid>
            </SearchWrapper>
          </Grid>
        </Content>
      </Page>
    ),
    title: 'Search with Backend Insights',
    path: '/search-backend-insights',
  })
  .render();
