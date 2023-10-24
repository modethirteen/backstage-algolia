import {
  IndexObjectWithIdAndTimestamp,
  SearchProxyRequest,
} from 'backstage-plugin-algolia-common';
import {
  SearchForFacetValuesResponse,
  SearchResponse,
} from '@algolia/client-search';
import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { PipelineOptionsInterface } from './pipelines';

export type AlgoliaBackendQueryResultsHandler = (
  results: (
    | SearchForFacetValuesResponse
    | SearchResponse<IndexObjectWithIdAndTimestamp>
  )[],
  options?: SearchProxyRequest['options'],
) => Promise<
  (
    | SearchForFacetValuesResponse
    | SearchResponse<IndexObjectWithIdAndTimestamp>
  )[]
>;

export interface AlgoliaBackendExtensionPoint {
  addQueryResultsHandler: (handler: AlgoliaBackendQueryResultsHandler) => void;
  replacePipelines: (pipelines: PipelineOptionsInterface[]) => void;
  addPipeline: (...pipelines: PipelineOptionsInterface[]) => void;
}

export const algoliaBackendExtensionPoint =
  createExtensionPoint<AlgoliaBackendExtensionPoint>({
    id: 'algolia.backend',
  });
