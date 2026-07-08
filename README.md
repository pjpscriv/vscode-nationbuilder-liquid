# NationBuilder Liquid

The development experience for NationBuilder templates has comparitively sparse tooling. This extension is a first attempt to remedy that.  

This is a VS Code extension that adds go-to-definition navigation for `{% include %}` and `{% subpage %}` tags in a NationBuilder Liquid theme codebase.

## Features

Ctrl+Click (or Cmd+Click on macOS) on a quoted name inside a supported tag to jump directly to the referenced file.

```liquid
{% include "my_rad_component" %}
```

Ctrl+Clicking on `my_rad_component` opens `_my_rad_component.html`, wherever it lives in your workspace.

```liquid
{% subpage thing with "my_incredible_subpage" %}
```

Ctrl+Clicking on `my_incredible_subpage` opens `_my_incredible_subpage.html` the same way.

## Usage

With the extension installed, open any Liquid template file and Ctrl+Click on the quoted name inside an `{% include %}` or `{% subpage %}` statement.

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

- Support navigation for `{% tag %}` blocks
- "Find usages" for includes and subpages
- Autocompletion for NationBuilder Liquid objects ([reference](https://nationbuilder.com/liquid))
- Autocompletion for `{% include %}` file names

## Contributing

Issues and pull requests are welcome at [github.com/pjpscriv/vscode-nationbuilder-liquid](https://github.com/pjpscriv/vscode-nationbuilder-liquid).
