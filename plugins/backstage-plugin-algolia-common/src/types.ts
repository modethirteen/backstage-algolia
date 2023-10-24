import { z } from 'zod';

export interface IndexObject {
  type: string;
  title: string;
  text: string;
  location: string;
  path: string;
  keywords: string[];
  kind: string;
  name: string;
  namespace: string;
  tags?: string[];
  summary?: string;
  displayTitle?: string;
}

export interface IndexObjectWithIdAndTimestamp extends IndexObject {
  objectID: string;
  timestamp: string;
}

export const searchProxyRequestSchema = z.object({
  requests: z.array(z.any()),
  options: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export type SearchProxyRequest = z.infer<typeof searchProxyRequestSchema>;

export const insightsProxyRequestSchema = z.object({
  insightsMethod: z.string(),
  payload: z.record(z.any()),
  userToken: z.string().or(z.number()).optional(),
  authenticatedUserToken: z.string().or(z.number()).optional(),
});

export type InsightsProxyRequest = z.infer<typeof insightsProxyRequestSchema>;
