# Algolia for Backstage (Backend)

A collection of document collators, object builders, proxy service, and an indexer to fetch, prepare, and send objects to an Algolia search index.

## Credits

The pipeline approach to the collating, building, and indexing stages of the process was inspired by, and sometimes copied from, the core Backstage Search plugins:

- [@backstage/plugin-search-backend-node](https://github.com/backstage/backstage/tree/master/plugins/search-backend-node)
- [@backstage/plugin-search-backend-module-techdocs](https://github.com/backstage/backstage/tree/master/plugins/search-backend-module-techdocs)

Credit is due to the Backstage Search maintainers, in particular @iamEAP for the solution to search indexing back pressure through streams in [PR#9839](https://github.com/backstage/backstage/pull/9839).
