import { useAnalytics } from '@backstage/core-plugin-api';
import { Button } from '@material-ui/core';
import React from "react";
import { useClearRefinements } from 'react-instantsearch';

export const ClearRefinementsButton = (props: {
  label: string;
  onClear?: () => void;
}) => {
  const { label, onClear } = props;
  const analytics = useAnalytics();
  const { refine } = useClearRefinements();
  const onClick = () => {
    refine();
    analytics.captureEvent('click', `Clear search filters`, {
      attributes: {
        pluginId: 'algolia',
        extension: 'HierarchalSearchRefinement',
      },
    });
    if (onClear) {
      onClear();
    }
  };
  return <Button variant="outlined" onClick={onClick}>{label}</Button>;
};
