import { algoliaPlugin } from './plugin';

describe('backend', () => {
  it('should export plugin', () => {
    expect(algoliaPlugin).toBeDefined();
  });
});
