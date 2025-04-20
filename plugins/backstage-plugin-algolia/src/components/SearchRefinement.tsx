import { useAnalytics } from '@backstage/core-plugin-api';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  TextField,
  Typography,
  makeStyles,
} from '@material-ui/core';
import React, { useContext, useState } from 'react';
import type { UseRefinementListProps } from 'react-instantsearch';
import { useRefinementList } from 'react-instantsearch';
import { AlgoliaQueryIdContext } from './SearchContainer';
import { RefinementListRenderState } from 'instantsearch.js/es/connectors/refinement-list/connectRefinementList';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const useStyles = makeStyles({
  label: {
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  checkboxWrapper: {
    alignItems: 'center',
    display: 'flex',
    width: '100%',
  },
  chip: {
    margin: 8,
    cursor: 'pointer',
  },
  textWrapper: {
    alignItems: 'center',
    display: 'inline-flex',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  showMoreButton: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
});

export const SearchRefinement = (
  props: UseRefinementListProps & {
    className?: string;
    label: string;
    onRefinement?: (value: string) => void;
    onLoad?: (
      renderState: RefinementListRenderState,
    ) => RefinementListRenderState | void;
    includeSearch?: boolean;
  },
) => {
  const {
    className,
    label,
    onRefinement,
    onLoad,
    includeSearch = false,
    ...rest
  } = props;
  const { showMore } = props;
  const [searchValue, setSearchValue] = useState('');
  let renderState = useRefinementList(rest);
  if (onLoad) {
    const onLoadResult = onLoad({ ...renderState });
    if (onLoadResult) {
      renderState = onLoadResult;
    }
  }
  const {
    items,
    refine,
    canRefine,
    searchForItems,
    canToggleShowMore,
    toggleShowMore,
    isShowingMore,
  } = renderState;
  const { queryId } = useContext(AlgoliaQueryIdContext);
  const analytics = useAnalytics();
  const classes = useStyles();
  return (
    <FormControl fullWidth disabled={!canRefine} className={className}>
      <FormLabel className={classes.label}>{label}</FormLabel>
      {includeSearch && (
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search..."
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            setSearchValue(value);
            searchForItems(value);
          }}
          value={searchValue}
          disabled={!canRefine}
          margin="dense"
        />
      )}
      {items.length > 0 &&
        items.map(i => (
          <FormControlLabel
            key={i.value}
            classes={{
              root: classes.checkboxWrapper,
              label: classes.textWrapper,
            }}
            label={
              <Typography variant="body2" noWrap>
                {i.label}
                <Chip
                  className={classes.chip}
                  variant="outlined"
                  size="small"
                  label={i.count}
                />
              </Typography>
            }
            control={
              <Checkbox
                color="default"
                size="small"
                value={i.value}
                name={i.value}
                onChange={() => {
                  analytics.captureEvent(
                    'click',
                    i.isRefined ? 'Remove search refinement' : 'Refine search',
                    {
                      attributes: {
                        pluginId: 'algolia',
                        extension: 'SearchRefinement',
                        algoliaQueryId: queryId,
                        algoliaSearchRefinementLabel: label,
                        algoliaSearchRefinementValue: i.value,
                      },
                    },
                  );
                  refine(i.value);
                  setSearchValue('');
                  if (onRefinement) {
                    onRefinement(i.value);
                  }
                }}
                checked={i.isRefined}
              />
            }
          />
        ))}
      {items.length <= 0 && (
        <Box mt={1} mb={1}>
          <Typography variant="body2">
            <em>Not available with selected filters or query</em>
          </Typography>
        </Box>
      )}
      {showMore && canToggleShowMore && !isShowingMore && (
        <Button
          color="default"
          variant="outlined"
          size="small"
          onClick={() => toggleShowMore()}
          className={classes.showMoreButton}
        >
          <ExpandMoreIcon />
        </Button>
      )}
    </FormControl>
  );
};
