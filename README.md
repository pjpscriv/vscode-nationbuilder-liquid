# NationBuilder Liquid

The development experience for NationBuilder templates has comparitively sparse tooling. This extension is a first attempt to remedy that.  

This is a VS Code extension that adds go-to-definition and find-usages navigation for `{% include %}`, `{% subpage %}`, and `{% tag %}` tags in a NationBuilder Liquid theme codebase.

## Features

### Go to Definition

Ctrl+Click (or Cmd+Click on macOS) on a quoted name inside a supported tag to jump directly to the referenced file.

```liquid
{% include "my_rad_template" %}
{% subpage thing with "my_rad_template" %}
{% tag tag_name with "my_rad_template" %}
```

Ctrl+Clicking on `my_rad_template` in any of these opens `_my_rad_template.html`, wherever it lives in your workspace.

### Find Usages

Every partial (any file named `_<name>.html`) shows a "N usages" CodeLens above the first line, listing every `{% include %}`, `{% subpage %}`, and `{% tag %}` that references it, anywhere in the workspace. Click it to open a Peek References panel and jump straight to any usage.

## Usage

With the extension installed, open any Liquid template file and Ctrl+Click on the quoted name inside an `{% include %}`, `{% subpage %}`, or `{% tag %}` statement.

<details>
  <summary><b>File Resolution</b></summary>

  Names are resolved by searching the workspace for a file named `_<name>.html`. The search is recursive, so files can live anywhere in your project.
</details>

## Requirements

Your workspace should have `.html` files associated with the Liquid language. Add this to `.vscode/settings.json`:

```json
{
    "files.associations": {
        "*.html": "liquid"
    }
}
```

## Roadmap

Ideas for future versions:

- Autocompletion for NationBuilder Liquid objects ([reference](https://nationbuilder.com/liquid))
- Autocompletion for `{% include %}` file names
- Find usages and go-to-definition for Liquid variables

## Contributing

Issues and pull requests are welcome at [github.com/pjpscriv/vscode-nationbuilder-liquid](https://github.com/pjpscriv/vscode-nationbuilder-liquid).
