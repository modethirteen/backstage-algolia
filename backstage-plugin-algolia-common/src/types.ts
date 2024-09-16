export interface IndexObject {
  source: string;
  title: string;
  text: string;
  location: string;
  path: string;
  keywords: string[];
}

export interface IndexObjectWithIdAndTimestamp extends IndexObject {
  objectID: string;
  timestamp: string;
}
