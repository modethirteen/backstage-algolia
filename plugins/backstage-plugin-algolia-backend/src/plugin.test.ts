import { algoliaPlugin } from './plugin';
import { mockServices, startTestBackend } from '@backstage/backend-test-utils';
import { rootLifecycleServiceFactory } from '@backstage/backend-defaults/rootLifecycle';

describe('backend', () => {
  it('should export plugin', () => {
    expect(algoliaPlugin).toBeDefined();
  });

  it('triggers scheduled pipeline after root lifecycle completes', async () => {
    const scheduler = mockServices.scheduler.mock();
    const backend = await startTestBackend({
      features: [
        mockServices.rootConfig.factory({ data: {
          app: {
            baseUrl: 'https://example.com',
          },
          algolia: {
            backend: {
              apikey: 'foo',
              applicationId: 'bar',
              indexes: {
                catalog: {
                  name: 'xyzzy',
                },
                techdocs: {
                  name: 'plugh',
                },
              },
            },
          },
        } }),
        scheduler.factory,
        rootLifecycleServiceFactory,
        algoliaPlugin,
      ],
    });
    await backend.stop();
    expect(scheduler.scheduleTask).toHaveBeenCalledTimes(2);
  });
});
