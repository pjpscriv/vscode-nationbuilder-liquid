import { LiquidTag } from './types';

/*
 * Matches the include/subpage/tag like:
 * - {% include "name" %}
 * - {% include "name", var: value %}
 * - {% include "name"\n  var: value\n%}
 * - {% subpage thing with "name" %}
 * - {% tag thing with "name" %}
 */
export const LIQUID_TAGS: LiquidTag[] = [
  {
    pattern: /\{%-?\s*include\s+['"]([^'"]+)['"]/g,
    resolveFilename: (name) => `_${name}.html`,
  },
  {
    pattern: /\{%-?\s*subpage\s+\S+\s+with\s+['"]([^'"]+)['"]/g,
    resolveFilename: (name) => `_${name}.html`,
  },
  {
    pattern: /\{%-?\s*tag\s+\S+\s+with\s+['"]([^'"]+)['"]/g,
    resolveFilename: (name) => `_${name}.html`,
  },
];
