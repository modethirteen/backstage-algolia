import {
  Entity,
  RELATION_CHILD_OF,
  RELATION_MEMBER_OF,
  RELATION_OWNED_BY,
  RELATION_PART_OF,
  parseEntityRef,
} from '@backstage/catalog-model';
import { compare } from '../util';
import { IndexObject } from 'backstage-plugin-algolia-common';

type IndexObjectRefs = Omit<IndexObject, 'title' | 'text' | 'location' | 'source' | 'path' | 'section'>;

export const entityRefsBuilder = (entity: Entity): IndexObjectRefs => {
  let refs = {};
  const ownerTargetRef = entity.relations
    ?.find(r => r.type === RELATION_OWNED_BY)
    ?.targetRef;
  if (ownerTargetRef) {
    const parsedOwnerRef = parseEntityRef(ownerTargetRef);
    refs = {
      ...refs,
      owner: parsedOwnerRef.name,
      ownerRef: parsedOwnerRef,
    };
  }
  const domainTargetRef = entity.relations
    ?.find(r => r.type === RELATION_PART_OF && compare(parseEntityRef(r.targetRef).kind, 'domain'))
    ?.targetRef;
  if (domainTargetRef) {
    const parsedDomainRef = parseEntityRef(domainTargetRef);
    refs = {
      ...refs,
      domain: parsedDomainRef.name,
      domainRef: parsedDomainRef,
    };
  }
  const systemTargetRef = entity.relations
    ?.find(r => r.type === RELATION_PART_OF && compare(parseEntityRef(r.targetRef).kind, 'system'))
    ?.targetRef;
  if (systemTargetRef) {
    const parsedSystemRef = parseEntityRef(systemTargetRef);
    refs = {
      ...refs,
      system: parsedSystemRef.name,
      systemRef: parsedSystemRef,
    };
  }
  const parentTargetRef = entity.relations
    ?.find(r => r.type === RELATION_CHILD_OF && compare(parseEntityRef(r.targetRef).kind, 'group'))
    ?.targetRef;
  if (parentTargetRef) {
    const parsedParentRef = parseEntityRef(parentTargetRef);
    refs = {
      ...refs,
      parent: parsedParentRef.name,
      parentRef: parsedParentRef,
    };
  }
  const memberOfRefs = entity.relations
    ?.filter(r => r.type === RELATION_MEMBER_OF && compare(parseEntityRef(r.targetRef).kind, 'group'))
    ?.map(r => r.targetRef);
  if (memberOfRefs && memberOfRefs.length) {
    const parsedMemberOfRefs = memberOfRefs.map(m => parseEntityRef(m));
    refs = {
      ...refs,
      memberOf: parsedMemberOfRefs.map(r => r.name),
      memberOfRefs: parsedMemberOfRefs,
    };
  }
  return refs;
};