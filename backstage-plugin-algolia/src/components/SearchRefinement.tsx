import { useAnalytics } from '@backstage/core-plugin-api';
import {
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  Typography,
  makeStyles,
} from '@material-ui/core';
import React, { useContext } from 'react';
import type { UseRefinementListProps } from 'react-instantsearch';
import { useRefinementList } from 'react-instantsearch';
import { AlgoliaQueryIdContext } from './SearchContainer';
import { RefinementListRenderState } from 'instantsearch.js/es/connectors/refinement-list/connectRefinementList';

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
});

export const SearchRefinement = (props: UseRefinementListProps & {
  className?: string;
  label: string;
  onRefinement?: (value: string) => void;
  onLoad?: (renderState: RefinementListRenderState) => void;
}) => {
  const {
    className,
    label,
    onRefinement,
    onLoad,
    ...rest
  } = props;
  const renderState = useRefinementList(rest);
  if (onLoad) {
    onLoad(renderState);
  }
  const { items, refine, canRefine } = renderState;
  const { queryId } = useContext(AlgoliaQueryIdContext);
  const analytics = useAnalytics();
  const classes = useStyles();
  return (
    <FormControl
      fullWidth
      disabled={!canRefine}
      className={className}
    >
      <FormLabel className={classes.label}>{label}</FormLabel>
      {items.length > 0 && items.map(i => (
        <FormControlLabel
          key={i.value}
          classes={{
            root: classes.checkboxWrapper,
            label: classes.textWrapper,
          }}
          label={
            <Typography variant="body2" noWrap>
              {i.label}
              <Chip className={classes.chip} variant="outlined" size="small" label={i.count} />
            </Typography>
          }
          control={
            <Checkbox
              color="default"
              size="small"
              value={i.value}
              name={i.value}
              onChange={() => {
                analytics.captureEvent('click', i.isRefined ? 'Remove search refinement' : 'Refine search', {
                  attributes: {
                    pluginId: 'algolia',
                    extension: 'SearchRefinement',
                    algoliaQueryId: queryId,
                    algoliaSearchRefinementLabel: label,
                    algoliaSearchRefinementValue: i.value,
                  },
                });
                refine(i.value);
                if (onRefinement) {
                  onRefinement(i.value);
                }
              }}
              checked={i.isRefined}
            />
          }
        />
      ))}
      {items.length <= 0 && <em>Not available with selected filters or query</em>}
    </FormControl>
  );
};
