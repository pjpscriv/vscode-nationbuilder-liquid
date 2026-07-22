import { CancellationToken, CodeLens, CodeLensProvider, Disposable, EventEmitter, Location, Position, TextDocument, workspace, Range, Uri } from 'vscode';
import { LIQUID_TAGS } from '../consts';
import * as path from 'path';


class UsagesCodeLens extends CodeLens {
  constructor(
    public readonly partialName: string,
    public readonly documentUri: Uri
  ) {
    super(new Range(0, 0, 0, 0));
  }
}


export class LiquidUsagesCodeLensProvider implements CodeLensProvider, Disposable {
  private readonly _onCodeLensesChanged = new EventEmitter<void>();
  private readonly _disposables: Disposable[] = [ this._onCodeLensesChanged ];
  
  public readonly onDidChangeCodeLenses = this._onCodeLensesChanged.event;

  constructor() {
    // Refresh codelenses when any .html file in the workspace is touched
    const htmlWatcher = workspace.createFileSystemWatcher('**/*.html');
    this._disposables.push(
      htmlWatcher,
      htmlWatcher.onDidCreate(() => this._onCodeLensesChanged.fire()),
      htmlWatcher.onDidChange(() => this._onCodeLensesChanged.fire()),
      htmlWatcher.onDidDelete(() => this._onCodeLensesChanged.fire())
    );
  }

  public provideCodeLenses(document: TextDocument): CodeLens[] {
    const partialName = getPartialName(document.fileName);
    return partialName ? [ new UsagesCodeLens(partialName, document.uri) ] : [];
  }

  public async resolveCodeLens(codeLens: CodeLens, token: CancellationToken): Promise<CodeLens> {
    if (!(codeLens instanceof UsagesCodeLens)) {
      return codeLens;
    }

    const locations = await findUsages(codeLens.partialName, token);

    codeLens.command = locations.length > 0
      ? {
        title: `${locations.length} usage${locations.length === 1 ? '' : 's'}`,
        command: 'editor.action.showReferences',
        arguments: [codeLens.documentUri, new Position(0, 0), locations],
      }
      : { title: 'No usages found', command: '' };

    return codeLens;
  }

  public dispose(): void {
    this._disposables.forEach((d) => d.dispose());
  }
}


// Partials are named `_<name>.html`; that's the name other templates
// reference them by in {% include %}, {% subpage %}, and {% tag %} tags.
function getPartialName(fileName: string): string | null {
  const match = path.basename(fileName).match(/^_(.+)\.html$/);
  return match ? match[1] : null;
}


async function findUsages(partialName: string, token: CancellationToken): Promise<Location[]> {
  // Get all html files in the repo
  // TODO: Add optional extras to exclude GlobResults here?
  const files = await workspace.findFiles('**/*.html', '**/node_modules/**');

  if (token.isCancellationRequested) {
    return [];
  }

  // In parallell - check each file for usages
  const results = await Promise.all(
    files.map((file) => findUsagesInFile(file, partialName))
  );

  return results.flat();
}


async function findUsagesInFile(file: Uri, partialName: string): Promise<Location[]> {
  const bytes = await workspace.fs.readFile(file);
  const text = new TextDecoder('utf-8').decode(bytes);
  const offsets = lineStartOffsets(text);
  const locations: Location[] = [];

  for (const tag of LIQUID_TAGS) {
    tag.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tag.pattern.exec(text)) !== null) {
      if (match[1] !== partialName) {
        continue;
      }

      const nameStart = match.index + match[0].indexOf(match[1]);
      const nameEnd = nameStart + match[1].length;
      const range = new Range(offsetToPosition(offsets, nameStart), offsetToPosition(offsets, nameEnd));
      locations.push(new Location(file, range));
    }
  }

  return locations;
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


function offsetToPosition(offsets: number[], offset: number): Position {
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

  return new Position(lo, offset - offsets[lo]);
}
