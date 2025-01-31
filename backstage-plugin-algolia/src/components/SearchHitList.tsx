import { Link } from '@backstage/core-components';
import { AnalyticsContext, useAnalytics } from '@backstage/core-plugin-api';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Typography,
} from '@material-ui/core';
import { IndexObjectWithIdAndTimestamp } from 'backstage-plugin-algolia-common';
import React, {
  ComponentType,
  ReactNode,
  useContext,
  useEffect,
} from 'react';
import {
  Highlight,
  useInfiniteHits,
  UseInfiniteHitsProps,
  useStats,
} from 'react-instantsearch';
import { AlgoliaQueryIdContext } from './SearchContainer';
import { InfiniteHitsRenderState } from 'instantsearch.js/es/connectors/infinite-hits/connectInfiniteHits';

const tryGetPath = (location: string) => {
  try {
    const url = new URL(location);
    return url.hash !== '' ? `${url.pathname}${url.hash}` : url.pathname;
  } catch (_) {
    return null;
  }
}

export const SearchHitList = (props: UseInfiniteHitsProps & {
  highlight?: boolean;
  HitTitleContent?: ComponentType<{
    object: IndexObjectWithIdAndTimestamp,
    promoted: boolean;
    children: ReactNode,
  }>;
  HitDescriptionContent?: ComponentType<{
    object: IndexObjectWithIdAndTimestamp,
    promoted: boolean;
    children: ReactNode,
  }>;
  onClick?: (data: {
    event: React.MouseEvent<any, MouseEvent>;
    object: IndexObjectWithIdAndTimestamp;
    queryId: string;
  }) => void;
  onLoad?: (renderState: InfiniteHitsRenderState) => InfiniteHitsRenderState | void;
  initialState?: InfiniteHitsRenderState;
}) => {
  const {
    HitTitleContent,
    HitDescriptionContent,
    highlight = false,
    onClick,
    onLoad,
    initialState,
    ...rest
  } = props;
  const { setQueryId } = useContext(AlgoliaQueryIdContext);
  let renderState = initialState ?? useInfiniteHits(rest);
  if (onLoad) {
    const onLoadResult = onLoad({ ...renderState });
    if (onLoadResult) {
      renderState = onLoadResult;
    }
  }
  const { hits, results, isLastPage, showMore, sendEvent } = renderState;
  const { nbHits: hitCount } = useStats();
  const analytics = useAnalytics();
  const queryId = results?.queryID ?? '';
  useEffect(() => {

    // provide all companion search components with query id context
    setQueryId(queryId);
    if (results?.query) {
      analytics.captureEvent('search', results.query, {
        value: hitCount,
        attributes: {
          pluginId: 'algolia',
          extension: 'SearchContainer',
          algoliaQueryId: queryId,
        },
      });
    }
  }, [results, queryId]);
  return (
    <>
      <List subheader={<ListSubheader>{hitCount} results</ListSubheader>}>
        {hits.map(h => {
          const object = h as unknown as IndexObjectWithIdAndTimestamp;
          const { location, text, title, objectID } = object;
          const path = tryGetPath(location);
          const titleContent = (
            <>
              <Typography variant="h6">
                <AnalyticsContext attributes={{
                  pluginId: 'algolia',
                  extension: 'SearchHitList',
                  algoliaQueryId: queryId,
                  algoliaObjectId: objectID,
                }}>
                  <Link to={location} onClick={e => {
                    sendEvent('click', h, 'Hit Clicked');
                    if (onClick) {
                      onClick({ event: e, object, queryId });
                    }
                  }}>
                    {highlight ? <Highlight attribute="title" hit={h} /> : title}
                  </Link>
                </AnalyticsContext>
              </Typography>
              {path && (
                <Typography
                  variant="body2"
                  gutterBottom={true}
                >
                  {path}
                </Typography>
              )}
            </>
          );
          const descriptionContent = (
            <>
              <Typography
                component="span"
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden',
                }}
                color="textSecondary"
                variant="body2"
              >
                {highlight ? <Highlight attribute="text" hit={h} /> : text}
              </Typography>
            </>
          );
          return (
            <ListItem key={objectID} divider>
              <ListItemText
                primary={HitTitleContent
                  ? <HitTitleContent object={object} promoted>{titleContent}</HitTitleContent>
                  : titleContent
                }
                secondary={HitDescriptionContent
                  ? <HitDescriptionContent object={object} promoted>{descriptionContent}</HitDescriptionContent>
                  : descriptionContent
                }
              />
            </ListItem>
          );
        })}
      </List>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Button
          disabled={isLastPage}
          color="primary"
          variant="contained"
          onClick={() => showMore()}
        >
          Show more results
        </Button>
      </Box>
    </>
  )
};
