export interface IndexObject {
  source: string;
  title: string;
  text: string;
  location: string;
  path: string;
  keywords: string[];
  tags?: string[];
  summary?: string;
  displayTitle?: string;
}

export interface IndexObjectWithIdAndTimestamp extends IndexObject {
  objectID: string;
  timestamp: string;
}
