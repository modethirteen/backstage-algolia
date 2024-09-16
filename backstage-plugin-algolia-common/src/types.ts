export interface IndexObject {
  source: string;
  title: string;
  text: string;
  location: string;
  keywords: string[];
}

export interface IndexObjectWithIdAndTimestamp extends IndexObject {
  objectID: string;
  timestamp: string;
}
