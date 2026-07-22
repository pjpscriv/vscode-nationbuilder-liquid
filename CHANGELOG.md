# Change Log

All notable changes to the "NationBuilder Liquid" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.3.0]

- Added autocompletion and hover documentation for NationBuilder Liquid objects (e.g. `page.basic.content`), sourced from a scraped copy of the [Liquid object reference](https://nationbuilder.com/liquid)
- Fixed go-to-definition not resolving tags when the opening `{%` is on a different line to the tag name (e.g. `{%\n  tag thing with "name"\n%}`)
- Refactored the extension into separate modules instead of a single `extension.ts` file

## [1.2.0]

- Added "N usages" CodeLens above partials (files matching `_name.html`), showing every `{% include %}`, `{% subpage %}`, and `{% tag %}` reference to that partial across the workspace via the built-in Peek References view

## [1.1.0]

- Added go-to-definition support for `{% tag thing with "name" %}` tags (resolves to `_name.html`, same convention as `subpage`)

## [1.0.0]

- Renamed extension to "NationBuilder Liquid" (`vscode-nationbuilder-liquid`) ahead of first Marketplace publish
- Added extension icon, MIT license, and repository link

## [0.0.4]

- Added go-to-definition support for `{% subpage thing with "name" %}` tags (resolves to `_name.html`, same underscore-prefix convention as `include`)

## [0.0.3]

- Initial release
