import { Entity, GroupEntity, UserEntity, getCompoundEntityRef, stringifyEntityRef } from "@backstage/catalog-model";

export const compare = (a: string | undefined, b: string | undefined): boolean =>
  Boolean(a && a?.toLocaleLowerCase('en-US') === b?.toLocaleLowerCase('en-US'));

export const humanizeEntityName = (entity: Entity) => {
  const ref = getCompoundEntityRef(entity);
  if (compare(ref.kind, 'user')) {
    const e = entity as UserEntity;
    return e.spec.profile?.displayName ?? entity.metadata.title ?? stringifyEntityRef(entity);
  }
  if (compare(ref.kind, 'group')) {
    const e = entity as GroupEntity;
    return e.spec.profile?.displayName ?? entity.metadata.title ?? stringifyEntityRef(entity);
  }
  return entity.metadata.title ?? stringifyEntityRef(entity);
}
