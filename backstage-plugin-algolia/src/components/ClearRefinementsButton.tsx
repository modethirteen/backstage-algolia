import { useAnalytics } from '@backstage/core-plugin-api';
import { Button } from '@material-ui/core';
import React, { useContext } from "react";
import { useClearRefinements } from 'react-instantsearch';
import { AlgoliaQueryIdContext } from './SearchContainer';

export const ClearRefinementsButton = (props: {
  label: string;
  onClear?: () => void;
}) => {
  const { label, onClear } = props;
  const analytics = useAnalytics();
  const { queryId } = useContext(AlgoliaQueryIdContext);
  const { refine } = useClearRefinements();
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
  return <Button variant="outlined" onClick={onClick}>{label}</Button>;
};
