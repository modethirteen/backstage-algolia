import { CollatorResult } from "./types";

export interface TopicProviderInterface {
  getTopics(options: { result: CollatorResult }): Promise<string[]>;
}
