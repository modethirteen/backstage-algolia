import { IconComponent } from '@backstage/core-plugin-api';
import {
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  Typography,
  makeStyles,
} from '@material-ui/core';
import FilterIcon from '@material-ui/icons/FilterList';
import React from 'react';
import { useRefinementList } from 'react-instantsearch';

export interface SearchRefinementItem {
  value: string;
  label: string;
  highlighted?: string;
  count: number;
  isRefined: boolean;
}

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

export const SearchRefinement = (props: {
  attribute: string;
  className?: string;
  label: string;
  transformItems?: (item: SearchRefinementItem) => SearchRefinementItem & {
    Icon: IconComponent;
  };
  onRefinement?: (value: string) => void;
}) => {
  const {
    attribute,
    className,
    label,
    transformItems = i => ({
      ...i,
      Icon: FilterIcon,
    }),
    onRefinement,
  } = props;
  const { items, refine, canRefine } = useRefinementList({
    attribute,
  });
  const classes = useStyles();
  const transformedItems = items.map(transformItems);
  return (
    <FormControl
      fullWidth
      disabled={!canRefine}
      className={className}
    >
      <FormLabel className={classes.label}>{label}</FormLabel>
      {transformedItems.length > 0 && transformedItems.map(i => (
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
              color="primary"
              size="small"
              value={i.value}
              name={i.value}
              onChange={() => {
                refine(i.value);
                if (onRefinement) {
                  onRefinement(i.value);
                }
              }}
              checked={i.isRefined}
              icon={<i.Icon />}
              checkedIcon={<i.Icon />}
            />
          }
        />
      ))}
      {transformedItems.length <= 0 && <em>Not available with selected filters or query</em>}
    </FormControl>
  );
};