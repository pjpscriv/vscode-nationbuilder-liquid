import { TextDocument, Position, Definition, workspace, Location, window } from 'vscode';
import { LIQUID_TAGS } from '../consts';

/**
 * Resolves go-to-definition for the Liquid tag at the given position: matches the
 * whole document against known tag patterns (tags can span multiple lines, e.g.
 * `{%\n  tag thing with "name"\n%}`), and if the cursor is over the tag's name
 * argument, resolves the target filename and searches the workspace for a matching file.
 *
 * @param document The file being edited.
 * @param position The cursor position within that file.
 * @returns The definition location, or null if no tag/file was found at the position.
 */
export async function provideDefinition(document: TextDocument, position: Position): Promise<Definition | null> {
  // Match against the whole document, since a tag's opening `{%` can be on a
  // different line to its name argument
  const text = document.getText();
  const cursorOffset = document.offsetAt(position);

  // Iterate 'include' / 'subpage' / 'tag' tag regexes
  for (const tag of LIQUID_TAGS) {
    tag.pattern.lastIndex = 0;
    let match = tag.pattern.exec(text);

    // Iterate document matches (there can be multiple)
    while (match !== null) {
      const name = match[1];

      // Find where the name string sits in the document
      const nameStart = match.index + match[0].indexOf(name);
      const nameEnd = nameStart + name.length;

      // If name doesn't match cursor position - exit
      if (cursorOffset < nameStart || cursorOffset > nameEnd) {
        match = tag.pattern.exec(text);
        continue;
      }
      
      // Attempt to find the file
      const targetFilename = `_${name}.html`;
      // TODO: Add *dist* to exclude GlobPattern? _refs/ too? - maybe this can be made configurable
      const files = await workspace.findFiles(`**/${targetFilename}`, '**/node_modules/**', 1);
      
      // If couldn't find file - exit
      if (files.length <= 0) {
        window.showWarningMessage(`NationBuilder Liquid: could not find file "${targetFilename}" in workspace.`);
        return null;
      }
      
      // Return file!
      const targetFile = files[0];
      return new Location(targetFile, new Position(0, 0));
    }
  }
  
  return null;
}