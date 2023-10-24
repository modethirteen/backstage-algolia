import { Content, Page } from '@backstage/core-components';
import { createDevApp } from '@backstage/dev-utils';
import { Grid, Paper } from '@material-ui/core';
import React, { ReactNode } from 'react';
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
import {
  SearchContextProvider,
  SearchResultList,
} from '@backstage/plugin-search-react';

const SearchWrapper = (props: { children: ReactNode }) => {
  const { children } = props;
  return (
    <SearchContainer
      future={{
        preserveSharedStateOnUnmount: true,
      }}
      authenticatedUserToken="user-dev"
      userToken="anonymous-dev"
      skipEmptyQueries={true}
    >
      {children}
    </SearchContainer>
  );
};

createDevApp()
  .registerPlugin(algoliaPlugin)
  .addPage({
    element: (
      <Page themeId="tool">
        <Content>
          <Grid container direction="row">
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
                  <SearchRefinement label="Type" attribute="type" />
                </Paper>
                <Paper>
                  <SearchRefinement
                    label="Tags"
                    attribute="tags"
                    includeSearch={true}
                  />
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
                <SearchHitList onClick={e => console.log(e)} />
              </Grid>
            </SearchWrapper>
          </Grid>
        </Content>
      </Page>
    ),
    title: 'Algolia Components',
    path: '/algolia-components',
  })
  .addPage({
    element: (
      <Page themeId="tool">
        <Content>
          <Grid container direction="row">
            <Grid item lg={3} md={4} sm={12} xs={12}>
              <SearchContextProvider>
                <Paper>
                  <SearchResultList
                    query={{
                      term: 'foo bar',
                      types: ['techdocs'],
                    }}
                  />
                </Paper>
              </SearchContextProvider>
            </Grid>
          </Grid>
        </Content>
      </Page>
    ),
    title: 'Search Components',
    path: '/search-components',
  })
  .render();
