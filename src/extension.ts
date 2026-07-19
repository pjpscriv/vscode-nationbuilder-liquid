import * as path from 'path';
import * as vscode from 'vscode';

interface LiquidTag {
  // Must capture the target name in group 1.
  pattern: RegExp;
  resolveFilename: (name: string) => string;
}

const LIQUID_TAGS: LiquidTag[] = [
  {
    // Matches the include name from:
    // {% include "name" %}
    // {% include "name", var: value %}
    // {% include "name"\n  var: value\n%}
    pattern: /\{%-?\s*include\s+['"]([^'"]+)['"]/g,
    resolveFilename: (name) => `_${name}.html`,
  },
  {
    // Matches the subpage name from:
    // {% subpage thing with "name" %}
    pattern: /\{%-?\s*subpage\s+\S+\s+with\s+['"]([^'"]+)['"]/g,
    resolveFilename: (name) => `_${name}.html`,
  },
  {
    // Matches the tag name from:
    // {% tag thing with "name" %}
    pattern: /\{%-?\s*tag\s+\S+\s+with\s+['"]([^'"]+)['"]/g,
    resolveFilename: (name) => `_${name}.html`,
  },
];

// Partials are named `_<name>.html`; that's the name other templates
// reference them by in {% include %}, {% subpage %}, and {% tag %} tags.
function getPartialName(fileName: string): string | null {
  const match = path.basename(fileName).match(/^_(.+)\.html$/);
  return match ? match[1] : null;
}

// Byte offset of the start of each line, so match offsets can be converted
// to Positions without paying for a full TextDocument per file.
function lineStartOffsets(text: string): number[] {
  const offsets = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

function offsetToPosition(offsets: number[], offset: number): vscode.Position {
  let lo = 0;
  let hi = offsets.length - 1;
  
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  
  return new vscode.Position(lo, offset - offsets[lo]);
}

async function findUsagesInFile(
  file: vscode.Uri,
  partialName: string
): Promise<vscode.Location[]> {
  const bytes = await vscode.workspace.fs.readFile(file);
  const text = new TextDecoder('utf-8').decode(bytes);
  const offsets = lineStartOffsets(text);
  const locations: vscode.Location[] = [];
  
  for (const tag of LIQUID_TAGS) {
    tag.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = tag.pattern.exec(text)) !== null) {
      if (match[1] !== partialName) {
        continue;
      }
      
      const nameStart = match.index + match[0].indexOf(match[1]);
      const nameEnd = nameStart + match[1].length;
      const range = new vscode.Range(
        offsetToPosition(offsets, nameStart),
        offsetToPosition(offsets, nameEnd)
      );
      locations.push(new vscode.Location(file, range));
    }
  }
  
  return locations;
}

async function findUsages(
  partialName: string,
  token: vscode.CancellationToken
): Promise<vscode.Location[]> {
  const files = await vscode.workspace.findFiles('**/*.html', '**/node_modules/**');
  
  if (token.isCancellationRequested) {
    return [];
  }
  
  const results = await Promise.all(
    files.map((file) => findUsagesInFile(file, partialName))
  );
  
  return results.flat();
}

class UsagesCodeLens extends vscode.CodeLens {
  constructor(
    public readonly partialName: string,
    public readonly documentUri: vscode.Uri
  ) {
    super(new vscode.Range(0, 0, 0, 0));
  }
}

class LiquidUsagesCodeLensProvider implements vscode.CodeLensProvider, vscode.Disposable {
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
  private readonly _disposables: vscode.Disposable[] = [this._onDidChangeCodeLenses];
  
  constructor() {
    // Usage counts can go stale as other files change, so refresh
    // lenses whenever any .html file in the workspace is touched.
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.html');
    this._disposables.push(
      watcher,
      watcher.onDidCreate(() => this._onDidChangeCodeLenses.fire()),
      watcher.onDidChange(() => this._onDidChangeCodeLenses.fire()),
      watcher.onDidDelete(() => this._onDidChangeCodeLenses.fire())
    );
  }
  
  dispose(): void {
    this._disposables.forEach((d) => d.dispose());
  }
  
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const partialName = getPartialName(document.fileName);
    return partialName ? [new UsagesCodeLens(partialName, document.uri)] : [];
  }
  
  async resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens> {
    if (!(codeLens instanceof UsagesCodeLens)) {
      return codeLens;
    }
    
    const locations = await findUsages(codeLens.partialName, token);
    
    codeLens.command = locations.length > 0
    ? {
      title: `${locations.length} usage${locations.length === 1 ? '' : 's'}`,
      command: 'editor.action.showReferences',
      arguments: [codeLens.documentUri, new vscode.Position(0, 0), locations],
    }
    : { title: 'No usages found', command: '' };
    
    return codeLens;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Liquid Include Navigator: activated!');
  
  const provider = vscode.languages.registerDefinitionProvider(
    { language: 'liquid' },
    {
      async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
      ): Promise<vscode.Definition | null> {
        const line = document.lineAt(position).text;
        
        for (const tag of LIQUID_TAGS) {
          tag.pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          
          while ((match = tag.pattern.exec(line)) !== null) {
            const name = match[1];
            
            // Find where the name string sits in the line
            const nameStart = match.index + match[0].indexOf(name);
            const nameEnd = nameStart + name.length;
            
            if (position.character < nameStart || position.character > nameEnd) {
              continue;
            }
            
            const targetFilename = tag.resolveFilename(name);
            const files = await vscode.workspace.findFiles(
              `**/${targetFilename}`,
              '**/node_modules/**'
            );
            
            if (files.length > 0) {
              return new vscode.Location(files[0], new vscode.Position(0, 0));
            }
            
            vscode.window.showWarningMessage(
              `Liquid Include Navigator: could not find file "${targetFilename}" in workspace.`
            );
            return null;
          }
        }
        
        return null;
      }
    }
  );
  
  context.subscriptions.push(provider);
  
  const codeLensProvider = new LiquidUsagesCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ language: 'liquid' }, codeLensProvider),
    codeLensProvider
  );
}

export function deactivate() {}