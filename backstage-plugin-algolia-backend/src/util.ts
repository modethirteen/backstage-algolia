export const compare = (a: string | undefined, b: string | undefined): boolean =>
  Boolean(a && a?.toLocaleLowerCase('en-US') === b?.toLocaleLowerCase('en-US'));
