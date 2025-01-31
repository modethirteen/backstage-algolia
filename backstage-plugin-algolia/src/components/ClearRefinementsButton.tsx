import { useAnalytics } from '@backstage/core-plugin-api';
import { Button } from '@material-ui/core';
import React, { useContext } from "react";
import { ClearRefinementsProps, useClearRefinements } from 'react-instantsearch';
import { AlgoliaQueryIdContext } from './SearchContainer';
import { ClearRefinementsRenderState } from 'instantsearch.js/es/connectors/clear-refinements/connectClearRefinements';

export const ClearRefinementsButton = (props: ClearRefinementsProps & {
  label: string;
  onClear?: () => void;
  onLoad?: (renderState: ClearRefinementsRenderState) => ClearRefinementsRenderState | void;
  initialState?: ClearRefinementsRenderState;
}) => {
  const {
    label,
    onClear,
    onLoad,
    initialState,
    ...rest
  } = props;
  const analytics = useAnalytics();
  const { queryId } = useContext(AlgoliaQueryIdContext);
  let renderState = initialState ?? useClearRefinements(rest);
  if (onLoad) {
    const onLoadResult = onLoad({ ...renderState });
    if (onLoadResult) {
      renderState = onLoadResult;
    }
  }
  const { refine, canRefine } = renderState;
  const onClick = () => {
    analytics.captureEvent('click', `Clear search refinements`, {
      attributes: {
        pluginId: 'algolia',
        extension: 'ClearRefinementsButton',
        algoliaQueryId: queryId,
      },
    });
    refine();
    if (onClear) {
      onClear();
    }
  };
  return <Button variant="outlined" onClick={onClick} disabled={!canRefine}>{label}</Button>;
};
