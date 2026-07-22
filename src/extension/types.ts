import * as vscode from 'vscode';

export interface LiquidTag {
  pattern: RegExp; // Must capture the target name in group 1.
  resolveFilename: (name: string) => string;
}

export interface DottedPathAtPosition {
  parts: string[];
  segmentIndex: number;
  range: vscode.Range;
}

