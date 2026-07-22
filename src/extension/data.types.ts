import type { NBObject, NBObjectMap, NBProperty } from '../data/nb-objects';

export type { NBObject, NBProperty, NBObjectMap };

export interface ResolvedProperty {
  kind: 'property';
  name: string;
  property: NBProperty;
  ownerName: string;
  owner: NBObject;
}

export interface ResolvedObject {
  kind: 'object';
  name: string;
  object: NBObject;
}

export interface ResolvedProperty {
  kind: 'property';
  name: string;
  property: NBProperty;
  ownerName: string;
  owner: NBObject;
}

export type Resolved = ResolvedObject | ResolvedProperty;
