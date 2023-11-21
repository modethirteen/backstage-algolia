import { IconComponent } from '@backstage/core-plugin-api';
import {
  Chip,
  Typography,
  alpha,
  makeStyles
} from '@material-ui/core';
import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import { TreeItem, TreeView } from '@material-ui/lab';
import React, { useMemo } from 'react';
import { useHierarchicalMenu } from 'react-instantsearch';

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
}));

interface HierarchyNode {
  count: number;
  data: HierarchyNode[] | null;
  isRefined: boolean;
  label: string;
  value: string;
}

const buildTree = (
  item: HierarchyNode,
  createOnClickHandler: (value: string) => (e: React.MouseEvent<Element, MouseEvent>) => void,
  Icon: IconComponent,
  nodeIds: string[],
  classes: ClassNameMap,
) => {
  const nodeId = nodeIds.length.toString();
  nodeIds.push(nodeId);
  return (
    <TreeItem
      key={`node-${nodeId}`}
      nodeId={nodeId}
      classes={{
        root: classes.node,
        group: classes.group,
        label: classes.textWrapper,
      }}
      label={
        <Typography variant="body2" noWrap>
          {item.label}
          <Chip className={classes.chip} variant="outlined" size="small" label={item.count} />
        </Typography>
      }
      onIconClick={e => {
        const handler = createOnClickHandler(item.value);
        return handler(e);
      }}
      onLabelClick={e => {
        const handler = createOnClickHandler(item.value);
        return handler(e);
      }}
      icon={<Icon />}
    >
      {Array.isArray(item.data) ? item.data.map(i => buildTree(i, createOnClickHandler, Icon, nodeIds, classes)) : null}
    </TreeItem>
  );
};

export const HierarchalSearchRefinement = (props: {
  attributes: string[];
  Icon: IconComponent;
  label: string;
  onRefinement?: (value: string) => void;
}) => {
  const classes = useStyles();
  const { attributes, Icon, label, onRefinement } = props;
  const { items, refine, canRefine } = useHierarchicalMenu({
    attributes,
  });
  const { tree, nodeIds } = useMemo(() => {
    const nodeIds: string[] = [];
    const createOnClickHandler = (value: string) =>
      (e: React.MouseEvent<Element, MouseEvent>) => {
        e.preventDefault();
        refine(value);
        if (onRefinement) {
          onRefinement(value);
        }
      };
    const tree = items.map(i => buildTree(i, createOnClickHandler, Icon, nodeIds, classes));
    return { tree, nodeIds };
  }, [items]);
  return (
    <>
      <Typography variant="body1" className={classes.label}>{label}</Typography>
      {nodeIds.length > 0 && (
        <TreeView expanded={nodeIds} disableSelection={!canRefine}>
          {tree}
        </TreeView>
      )}
      {nodeIds.length <= 0 && <em>Not available with selected filters or query</em>}
    </>
  );
};
