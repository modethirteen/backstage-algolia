import {
  Entity,
  RELATION_CHILD_OF,
  RELATION_OWNED_BY,
  RELATION_PART_OF,
  parseEntityRef,
} from '@backstage/catalog-model';
import { compare } from '../util';

export const entityRefsBuilder = (entity: Entity) => {
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
  return refs;
};