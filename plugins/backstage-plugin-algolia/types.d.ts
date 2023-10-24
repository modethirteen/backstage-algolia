declare module '*.icon.svg' {
  import { SvgIconProps } from '@material-ui/core';
  import { ComponentType } from 'react';
  const Icon: ComponentType<SvgIconProps>;
  export default Icon;
}
