![Asili Banner](https://raw.githubusercontent.com/Asili-Programming/asili-vscode/main/assets/Asili_Banner.png)

# <img src="https://raw.githubusercontent.com/Asili-Programming/asili-vscode/main/assets/Asili_Logo.png" alt="" width="40" valign="middle" /> Asili Language Support

Syntax highlighting and full language server support (Mwalimu) for the Asili language
(`.as`, `.asi`), plus syntax highlighting for `pata.toml`/`pata.lock` project manifests.

## Features

### Highlighting

- Grammar-based syntax highlighting — keywords, strings, numbers, comments, attributes, operators.
- Semantic highlighting on top of that (needs the language server running): every *usage* of a
  variable, parameter, or function is colored, not just its declaration. Also covers module-level
  constants, struct-literal field names, match-arm pattern bindings, and enum variants
  (`Some`/`Ok`/`Err`/custom, via a dedicated token type distinct from real types). `thabiti`
  bindings render differently from `weka`, and builtins render differently from your own
  functions.
- Syntax highlighting for `pata.toml` and `pata.lock`.

### Editing

- Hover — type information for variables, parameters, functions, structs, and traits.
- Signature help — parameter hints while typing a call, with real parameter names for your own
  functions and cross-file calls into your own other project files.
- Completion — keywords, builtin types, builtin functions, module-level declarations.
- Builtin standard-library functions are available without `leta`; snippets also support grouped
  declarations such as `weka r = 0.0, c = 0.0`.
- Code actions — quick-fixes for diagnostics (currently: "Add doc comment").
- Code lens — a "▶ Run Test" lens above every `#[jaribio]` function, running
  `pata jaribu --chuja <name>` in an integrated terminal.
- Lint commands — use **Asili: Lint Current File** or **Asili: Lint Workspace** to run
  `pata kagua` with the nearest `pata.toml` configuration.
- Formatting, folding ranges, rename (with `prepareRename` validation), and "highlight
  occurrences" (document highlight).

### Navigation

- Go to definition, find references, document symbols (file outline), and workspace symbol
  search — all of these work **across files** in your project, not just the one you have open:
  a call into your own sibling `.as` file resolves correctly, and searching for a
  struct/function finds it even in a file you haven't opened as a tab yet.

### Diagnostics

- Lex, parse, semantic, and lint errors, published as you type.
- Cross-file aware: the language server resolves your project's `pata.toml` and `leta`-imported
  files, so a legitimate call into your own other project file is recognized instead of
  false-positiving as an undefined function or unknown module.
- Re-checked automatically when a `.as`/`pata.toml`/`pata.lock` file changes on disk — including
  edits made outside the editor.

## Setup

The extension starts `pata mwalimu` as the language server. Make sure `pata` is on your PATH, or set a custom path in workspace settings:

```json
{
  "asili.serverPath": "/path/to/pata-cli",
  "asili.serverArgs": ["mwalimu"]
}
```

The "Run Test" code lens shells out to the `pata` CLI separately from the language server (which
may be a bundled `pata-lsp` binary with no sibling `pata`) — set `asili.cliPath` if `pata` isn't
on your PATH:

```json
{
  "asili.cliPath": "/path/to/pata"
}
```

For the complete global toolchain, install the CLI (which includes the linter, `pata kagua`) and language server with Cargo,
from a clone of [Asili](https://github.com/Asili-Programming/Asili):

```bash
cargo install --path pata/cli --bin pata-cli --force
cargo install --path pata/lsp --bin pata-lsp --force
```

Ensure `~/.cargo/bin` is on `PATH`. If the tools are installed elsewhere, set
`asili.serverPath` and `asili.cliPath` to their absolute paths.

Cross-file features (diagnostics, go to definition, references, workspace symbols) need a
`pata.toml` at your workspace root to know what your project's files and dependencies are —
without one, everything still works for a single open file, just without the cross-file parts.

## Building the extension

The extension lives in its own repository; the language server it bundles is built from an
[Asili](https://github.com/Asili-Programming/Asili) checkout, by default a sibling clone:

```bash
git clone https://github.com/Asili-Programming/Asili ../Asili   # or set ASILI_DIR
npm install
npm run build-lsp      # cargo build -p pata-lsp, copied to bin/pata-lsp
npm run compile        # type-check + esbuild bundle into out/
```

- **Development:** open this folder in VS Code and run **Run Extension** (F5) for an Extension
  Development Host.
- **Package and install:** `npx @vscode/vsce package --no-dependencies`, then
  `code --install-extension asili-<version>.vsix`.
- **API docs:** `cd docs-tooling && npm install && npm run typedoc` (output in
  `docs-site/typedoc/`; published to GitHub Pages on every push to `main`). TypeDoc is isolated
  in `docs-tooling/` with its own TypeScript (`^5.9`), because its peer-dependency range doesn't
  cover the extension's (`^7.0`) yet.
- **Word lists:** the grammar's builtin type and function lists are generated from Asili's
  compiler. CI checks them against Asili's `develop`; to regenerate, from the Asili checkout:
  `ASILI_VSCODE_DIR=<this repo> ASILI_GOLDEN=write cargo test -p pata-core --test editor_word_lists`.
