import { Link } from '@backstage/core-components';
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
import React, { ComponentType, ReactNode } from 'react';
import { Highlight, useInfiniteHits, useStats } from 'react-instantsearch';

const tryGetPath = (location: string) => {
  try {
    const url = new URL(location);
    return url.hash !== '' ? `${url.pathname}${url.hash}` : url.pathname;
  } catch (_) {
    return null;
  }
}

export const SearchHitList = (props: {
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
  transformObject?: (options: {
    object: IndexObjectWithIdAndTimestamp;
    promoted: boolean;
  }) => IndexObjectWithIdAndTimestamp;
}) => {
  const {
    HitTitleContent,
    HitDescriptionContent,
    highlight = false,
    transformObject,
  } = props;
  const { hits, isLastPage, showMore, sendEvent } = useInfiniteHits();
  const { nbHits: hitCount } = useStats();
  return (
    <>
      <List subheader={<ListSubheader>{hitCount} results</ListSubheader>}>
        {hits.map(h => {
          const promoted = h._rankingInfo?.promoted ?? false;
          const object = h as unknown as IndexObjectWithIdAndTimestamp;
          const { location, text, title, objectID } = transformObject
            ? transformObject({ object, promoted })
            : object;
          const path = tryGetPath(location);
          const titleContent = (
            <>
              <Typography variant="h6">
                <Link noTrack to={location} onClick={() => { sendEvent('click', h, 'Hit Clicked') }}>
                  {highlight ? <Highlight attribute="title" hit={h} /> : title}
                </Link>
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
                primary={HitTitleContent ? <HitTitleContent object={object} promoted>{titleContent}</HitTitleContent> : titleContent}
                secondary={HitDescriptionContent ? <HitDescriptionContent object={object} promoted>{descriptionContent}</HitDescriptionContent> : descriptionContent}
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
