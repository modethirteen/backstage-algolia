import { Button } from '@material-ui/core';
import React from "react";
import { useClearRefinements } from 'react-instantsearch';

export const ClearRefinementsButton = (props: {
  label: string;
  onClear?: () => void;
}) => {
  const { label, onClear } = props;
  const { refine } = useClearRefinements();
  const onClick = () => {
    refine();
    if (onClear) {
      onClear();
    }
  };
  return <Button variant="outlined" onClick={onClick}>{label}</Button>;
};
