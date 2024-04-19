import { IconComponent, useAnalytics } from '@backstage/core-plugin-api';
import {
  Chip,
  Typography,
  alpha,
  makeStyles,
} from '@material-ui/core';
import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import { TreeItem, TreeView } from '@material-ui/lab';
import React, { useContext, useMemo } from 'react';
import { useHierarchicalMenu } from 'react-instantsearch';
import DefaultCheckedIcon from '../icons/checked.icon.svg';
import DefaultIcon from '../icons/unchecked.icon.svg';
import { AlgoliaQueryIdContext } from './SearchContainer';
import { HierarchicalMenuItem } from 'instantsearch.js/es/connectors/hierarchical-menu/connectHierarchicalMenu';

const flatten = (array: HierarchicalMenuItem[]): HierarchicalMenuItem[] => array.flatMap(i => Array.isArray(i.data) ? flatten(i.data) : i);

const useStyles = makeStyles(theme => ({
  label: {
    color: theme.palette.text.secondary,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  chip: {
    margin: 8,
  },
  group: {
    marginLeft: 7,
    paddingLeft: 18,
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`,
  },
  node: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    outline: 0,
  },
  textWrapper: {
    alignItems: 'center',
    display: 'inline-flex',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  icon: {
    color: theme.palette.text.secondary,
  },
}));

interface HierarchyNode {
  count: number;
  data: HierarchyNode[] | null;
  isRefined: boolean;
  label: string;
  value: string;
}

const buildTree = (options: {
  item: HierarchyNode;
  CheckedIcon?: IconComponent;
  nodeIds: string[];
  refinedNodeIds: string[];
  classes: ClassNameMap;
}) => {
  const { item, CheckedIcon, nodeIds, refinedNodeIds, classes } = options;
  const nodeId = item.value;
  nodeIds.push(nodeId);
  if (item.isRefined) {
    refinedNodeIds.push(nodeId);
  }
  return (
    <TreeItem
      key={nodeId}
      nodeId={nodeId}
      classes={{
        root: classes.node,
        group: classes.group,
        label: classes.textWrapper,
        iconContainer: classes.icon,
      }}
      label={
        <Typography variant="body2" noWrap>
          {item.label}
          <Chip className={classes.chip} variant="outlined" size="small" label={item.count} />
        </Typography>
      }
      icon={item.isRefined && CheckedIcon ? <CheckedIcon /> : undefined}
    >
      {Array.isArray(item.data) ? item.data.map(i => buildTree({
        item: i,
        CheckedIcon,
        nodeIds,
        refinedNodeIds,
        classes,
      })) : null}
    </TreeItem>
  );
};

export const HierarchalSearchRefinement = (props: {
  attributes: string[];
  Icon?: IconComponent;
  CheckedIcon?: IconComponent;
  label: string;
  onRefinement?: (value: string) => void;
  queryId?: string;
}) => {
  const classes = useStyles();
  const {
    attributes,
    Icon = DefaultIcon as IconComponent,
    CheckedIcon = DefaultCheckedIcon as IconComponent,
    label,
    onRefinement,
  } = props;
  const { items, refine, canRefine } = useHierarchicalMenu({
    attributes,
  });
  const analytics = useAnalytics();
  const { queryId } = useContext(AlgoliaQueryIdContext);
  const { tree, nodeIds, refinedNodeIds } = useMemo(() => {
    const nodeIds: string[] = [];
    const refinedNodeIds: string[] = [];
    const tree = items.map(i => buildTree({
      item: i,
      CheckedIcon,
      nodeIds,
      refinedNodeIds,
      classes,
    }));
    return { tree, nodeIds, refinedNodeIds };
  }, [items]);
  return (
    <>
      <Typography variant="body1" className={classes.label}>{label}</Typography>
      {nodeIds.length > 0 && (
        <TreeView
          expanded={nodeIds}
          disableSelection={!canRefine}
          defaultCollapseIcon={CheckedIcon ? <CheckedIcon /> : undefined}
          defaultEndIcon={Icon ? <Icon /> : undefined}
          onNodeSelect={(_: any, nodeId: string) => {
            analytics.captureEvent('click', refinedNodeIds.includes(nodeId) ? 'Remove search refinement' : 'Refine search', {
              attributes: {
                pluginId: 'algolia',
                extension: 'HierarchalSearchRefinement',
                algoliaQueryId: queryId,
                algoliaSearchRefinementLabel: label,
                algoliaSearchRefinementValue: nodeId,
              },
            });
            refine(nodeId);
            if (onRefinement) {
              onRefinement(nodeId);
            }
          }}
        >
          {tree}
        </TreeView>
      )}
      {nodeIds.length <= 0 && <em>Not available with selected filters or query</em>}
    </>
  );
};
