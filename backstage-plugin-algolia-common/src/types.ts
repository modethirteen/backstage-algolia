import { CompoundEntityRef } from '@backstage/catalog-model';

export interface IndexObject {
  source: string;
  title: string;
  text: string;
  location: string;
  path: string;
  section: boolean;
  summary?: string;
  topics?: string[];
  entity?: {
    kind: string;
    namespace: string;
    name: string;
    title?: string;
    type?: string;
    lifecycle?: string;
    owner?: string;
    ownerRef?: CompoundEntityRef;
    parent?: string;
    parentRef?: CompoundEntityRef;
    domain?: string;
    domainRef?: CompoundEntityRef;
    system?: string;
    systemRef?: CompoundEntityRef;
    memberOf?: string[];
    memberOfRefs?: CompoundEntityRef[];
  };
}

export interface IndexObjectWithIdAndTimestamp extends IndexObject {
  objectID: string;
  timestamp: string;
}
