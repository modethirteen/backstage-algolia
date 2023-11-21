import { Breadcrumbs } from '@backstage/core-components';
import { Box, Link, Typography, makeStyles } from '@material-ui/core';
import React from 'react';
import { useBreadcrumb } from 'react-instantsearch';

export interface BreadcrumbItem {
  label: string;
  value: string | null;
}

const useStyles = makeStyles(({
  box: {
    marginTop: 8,
  },
  segment: {
    textDecoration: 'underline',
    cursor: 'pointer',
  },
}));

export const SearchBreadcrumb = (props: {
  attributes: string[];
  transformItems?: (items: BreadcrumbItem[]) => BreadcrumbItem[];
}) => {
  const { attributes, transformItems } = props;
  const classes = useStyles();
  const { items, refine } = useBreadcrumb({ attributes });
  const transformedItems = transformItems ? transformItems(items) : items;
  const segments = [ ...transformedItems.slice(0, -1)];
  const lastSegment = transformedItems[transformedItems.length - 1];
  return (
    <Box className={classes.box} display="flex" alignItems="center">
      <Typography variant="body2">
        Searching in
      </Typography>
      <span>&nbsp;</span>
      <Breadcrumbs color="primaryText">
        {segments.map(s => (
          <Link
            className={classes.segment}
            variant="body2"
            onClick={() => refine(s.value)}
          >
            {s.label}
          </Link>
        ))}
        {lastSegment && <Typography variant="body2">{lastSegment.label}</Typography> }
      </Breadcrumbs>
    </Box>
  );
};
