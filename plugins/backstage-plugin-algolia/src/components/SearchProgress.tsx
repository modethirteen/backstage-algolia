import React from 'react';
import { Progress } from '@backstage/core-components';
import { useInstantSearch } from "react-instantsearch";

export const SearchProgress = () => {
  const { status } = useInstantSearch();
  return status === 'loading' ? <Progress /> : null;
};
