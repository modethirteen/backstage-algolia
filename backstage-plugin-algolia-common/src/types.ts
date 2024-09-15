export interface IndexObject {
  source: string;
  title: string;
  text: string;
  location: string;
  keywords: string[];
  data?: object;
}

export interface IndexObjectWithIdAndTimestamp extends IndexObject {
  objectID: string;
  timestamp: string;
}
