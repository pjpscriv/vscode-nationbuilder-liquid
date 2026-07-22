import nbObjectsJson from '../data/nb-objects.json';
import { NBObjectMap, NBProperty, Resolved } from './data.types';

export const NB_DOCS_BASE_URL = 'https://nationbuilder.com';

export const nbObjects = nbObjectsJson as unknown as NBObjectMap;

/** URL of the NationBuilder doc page a resolved object/property was scraped from. */
export function getDocUrl(resolved: Resolved): string {
  const slug = resolved.kind === 'object' ? resolved.object.slug : resolved.owner.slug;
  return `${NB_DOCS_BASE_URL}/${slug}`;
}

export function getRootObjectNames(): string[] {
  return Object.keys(nbObjects).filter((name) => !name.includes('.'));
}

/**
 * Walks a dotted Liquid path (e.g. ["page", "basic", "content"]) through the
 * NationBuilder object graph, following a property's `type` link to descend
 * into whatever object it refers to. Returns the object/property found at
 * the *last* segment of `parts`.
 */
export function resolvePath(parts: readonly string[]): Resolved | undefined {
  if (parts.length === 0 || !parts[0]) {
    return undefined;
  }

  let currentName = parts[0];
  let current = nbObjects[currentName];
  if (!current) {
    return undefined;
  }

  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    const property = current.properties[segment];
    if (!property) {
      return undefined;
    }

    if (i === parts.length - 1) {
      return { kind: 'property', name: segment, property, ownerName: currentName, owner: current };
    }

    if (!property.type || !nbObjects[property.type]) {
      return undefined; // property has no further structure to descend into
    }

    currentName = property.type;
    current = nbObjects[currentName];
  }

  return { kind: 'object', name: currentName, object: current };
}

/** Lists the completions available under a path (empty parts = root objects). */
export function listChildren(parts: readonly string[]): Array<{ name: string; property?: NBProperty }> {
  if (parts.length === 0) {
    return getRootObjectNames().map((name) => ({ name }));
  }

  const resolved = resolvePath(parts);
  if (!resolved) {
    return [];
  }

  const object = resolved.kind === 'object'
    ? resolved.object
    : resolved.property.type ? nbObjects[resolved.property.type] : undefined;

  if (!object) {
    return [];
  }

  return Object.entries(object.properties).map(([name, property]) => ({ name, property }));
}
