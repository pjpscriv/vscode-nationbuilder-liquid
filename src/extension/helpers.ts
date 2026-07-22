import * as vscode from 'vscode';
import { NBProperty } from './data.types';

/**
 * True if `textBeforeCursor` sits inside an unclosed {{ ... or {% ... on the
 * same line. Liquid tags are conventionally single-line, so this per-line
 * heuristic (matching the rest of this extension's approach) avoids
 * suggesting/hovering NB objects inside plain HTML prose.
 */
export function isInsideLiquidExpression(textBeforeCursor: string): boolean {
  const lastOpen = Math.max(textBeforeCursor.lastIndexOf('{{'), textBeforeCursor.lastIndexOf('{%'));
  if (lastOpen === -1) {
    return false;
  }
  const lastClose = Math.max(textBeforeCursor.lastIndexOf('}}'), textBeforeCursor.lastIndexOf('%}'));
  return lastOpen > lastClose;
}

export function formatPropertyMarkdown(property: NBProperty, heading?: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  if (heading) {
    md.appendMarkdown(`**${heading}**`);
  }
  if (property.deprecated) {
    md.appendMarkdown(`${heading ? '\n\n' : ''}_Deprecated: no longer used._`);
  }
  if (property.description) {
    md.appendMarkdown(`\n\n${property.description}`);
  }
  if (property.example) {
    md.appendMarkdown(`\n\n\`${property.example}\``);
  }
  if (property.type) {
    md.appendMarkdown(`\n\nType: \`${property.type}\``);
  }
  return md;
}


