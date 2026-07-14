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
}

export function deactivate() {}