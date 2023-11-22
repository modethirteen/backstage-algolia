import {
  Button,
  IconButton,
  InputAdornment,
  TextField,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import React, {
  useEffect,
  useState,
} from 'react';
import { useSearchBox } from 'react-instantsearch';
import useDebounce from 'react-use/lib/useDebounce';

export const SearchBar = (props: {
  debounceTime?: number;
  placeholder?: string;
}) => {
  const {
    debounceTime = 200,
    placeholder = 'What can we help you find?',
  } = props;
  const { query, refine, clear } = useSearchBox();
  const [value, setValue] = useState<string>('');
  const [debouncedValue, setDebouncedValue] = useState<string>('');
  useDebounce(
    () => setDebouncedValue(value),
    debounceTime,
    [value],
  );
  useEffect(() => {
    if (debouncedValue.length > 2 || debouncedValue === '') {
      refine(debouncedValue);
    }
  }, [debouncedValue]);
  useEffect(() => {
    setValue(query);
  }, []);
  return (
    <TextField
      id="search-input"
      placeholder={placeholder}
      variant="outlined"
      margin="normal"
      value={value}
      fullWidth
      onChange={({ target }) => {
        setValue(target.value);
      }}
      onKeyDown={({ key }) => {
        if (key === 'Enter') {
          refine(value);
        }
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <IconButton size="small" disabled>
              <SearchIcon />
            </IconButton>
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <Button
              size="small"
              onClick={() => {
                clear();
                setValue('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                }
              }}
            >
              Clear
            </Button>
          </InputAdornment>
        ),
      }}
    />
  );
};
