import { PipelineResult } from './types';

export interface TopicProviderInterface {
  getTopics(options: { result: PipelineResult }): Promise<string[]>;
}
