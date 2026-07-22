import {
  Hover,
  MarkdownString,
  Position,
  Range,
  TextDocument
} from 'vscode';
import { isInsideLiquidExpression, formatPropertyMarkdown } from '../helpers';
import { getDocUrl, resolvePath } from '../data.helpers';
import { DottedPathAtPosition } from '../types';
import { isPathChar } from './autocomplete';


export function provideHover(document: TextDocument, position: Position): Hover | undefined {
  const line = document.lineAt(position.line).text;
  if (!isInsideLiquidExpression(line.slice(0, position.character))) {
    return undefined;
  }

  const found = getDottedPathAt(position.line, line, position.character);
  if (!found) {
    return undefined;
  }

  const resolved = resolvePath(found.parts.slice(0, found.segmentIndex + 1));
  if (!resolved) {
    return undefined;
  }

  if (resolved.kind === 'object') {
    const md = new MarkdownString(`**${resolved.object.title}**`);
    if (resolved.object.description) {
      md.appendMarkdown(`\n\n${resolved.object.description}`);
    }
    md.appendMarkdown(`\n\n[View in NationBuilder docs](${getDocUrl(resolved)})`);
    return new Hover(md, found.range);
  }

  const heading = `${resolved.ownerName}.${resolved.name}`;
  const md = formatPropertyMarkdown(resolved.property, heading);
  md.appendMarkdown(`\n\n[View in NationBuilder docs](${getDocUrl(resolved)})`);
  return new Hover(md, found.range);
}


/** Finds the full dotted-path token under `position` and which segment it's over. */
export function getDottedPathAt(line: number, text: string, character: number): DottedPathAtPosition | undefined {
  let start = character;
  while (start > 0 && isPathChar(text[start - 1])) {
    start--;
  }
  let end = character;
  while (end < text.length && isPathChar(text[end])) {
    end++;
  }
  if (start === end) {
    return undefined;
  }

  const parts = text.slice(start, end).split('.');

  let offset = start;
  let segmentIndex = parts.length - 1;
  for (let i = 0; i < parts.length; i++) {
    const segmentEnd = offset + parts[i].length;
    if (character <= segmentEnd) {
      segmentIndex = i;
      break;
    }
    offset = segmentEnd + 1; // skip the dot
  }

  return { parts, segmentIndex, range: new Range(line, start, line, end) };
}

