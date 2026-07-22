import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  CompletionItemTag,
  Position,
  TextDocument
} from 'vscode';
import { isInsideLiquidExpression, formatPropertyMarkdown } from '../helpers';
import { getRootObjectNames, nbObjects, resolvePath } from '../data.helpers';
import { NBProperty } from '../data.types';


export class LiquidObjectCompletionProvider implements CompletionItemProvider {
  provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    const line = document.lineAt(position.line).text;
    const before = line.slice(0, position.character);
    if (!isInsideLiquidExpression(before)) {
      return [];
    }

    const parts = getPathTextBefore(line, position.character).split('.');
    parts.pop(); // drop the word currently being typed; VS Code filters against it

    return listChildren(parts).map(({ name, property }) => this.toCompletionItem(name, property));
  }

  private toCompletionItem(name: string, property: NBProperty | undefined): CompletionItem {
    const item = new CompletionItem(
      name,
      property ? CompletionItemKind.Field : CompletionItemKind.Variable
    );

    if (property?.deprecated) {
      item.tags = [CompletionItemTag.Deprecated];
    }
    if (property?.type) {
      item.detail = `→ ${property.type}`;
    }
    if (property) {
      item.documentation = formatPropertyMarkdown(property);
    }

    return item;
  }
}

export function getPathTextBefore(line: string, character: number): string {
  let start = character;
  while (start > 0 && isPathChar(line[start - 1])) {
    start--;
  }
  return line.slice(start, character);
}

// Liquid identifiers plus '.' for path segments and trailing '?' on
// boolean-style property names, e.g. "page.is_homepage?".
export const PATH_CHAR = /[A-Za-z0-9_?.]/;

export function isPathChar(ch: string | undefined): boolean {
  return ch !== undefined && PATH_CHAR.test(ch);
}


/** Lists the completions available under a path (empty parts = root objects). */
export function listChildren(parts: readonly string[]): Array<{ name: string; property?: NBProperty; }> {
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

