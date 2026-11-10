# Asili VS Code extension — Technical Requirements Document

As of 10 November 2026 · Victor Kaiuki

The extension is a thin client: it resolves Pata tools, starts Mwalimu over LSP and `pata-dap`
over DAP, and exposes Pata workflows through commands, tasks and tests. Language behavior remains
in the Rust servers and CLI. This document describes the implementation of the
[Product Requirements Document](01-product-requirements.md).

## Architecture

```mermaid
flowchart LR
  subgraph ext["Extension (TypeScript, esbuild bundle)"]
    ext["extension.ts<br/>activation, LSP, status, CodeLens, DAP"]
    res["tools.ts<br/>resolve pata, pata-lsp, pata-dap"]
    cmd["commands.ts<br/>commands, tasks, status actions"]
    runtime["runtime.ts<br/>CLI tasks, tool checks, project root"]
    test["testing.ts<br/>TestController"]
    trace["trace.ts<br/>decoded trace tree"]
  end
  ext -- stdio --> mw["pata-lsp or pata mwalimu (Mwalimu)"]
  ext -- stdio --> dap["pata-dap"]
  cmd --> cli["pata CLI"]
  runtime --> cli
  test -- "jaribu --orodha --json, --chuja, --chanjo" --> cli
  res -.-> ext & cmd & runtime
```

The implementation is split across `src/extension.ts`, `src/tools.ts`, `src/commands.ts`,
`src/runtime.ts`, `src/testing.ts`, and `src/trace.ts`. `tools.ts` owns executable resolution;
`runtime.ts` owns project-root discovery, availability checks, and task construction. VS Code
contributions and localized labels are declared in `package.json` and `package.nls*.json`.

## Tool resolution

Tool resolution is centralized in `src/tools.ts`, with settings and fallbacks specific to each tool:

1. Mwalimu: `asili.serverPath`, then bundled `pata-lsp`, then `pata mwalimu` from `PATH`.
2. CLI: `asili.cliPath`, then `pata` from `PATH`.
3. Debugger: `asili.debuggerPath`, then bundled `pata-dap`, then `pata-dap` from `PATH`.
4. Standalone linter fallback: `asili.linterPath`, then `pata-lint` from `PATH`; the extension
   prefers `pata kagua` when the selected CLI supports it.

Missing CLI/tools are reported when the corresponding workflow is used, with installation and
settings actions. **Remaining validation:** exercise these dialogs and resolution precedence on
Windows and macOS as well as Linux.

## Commands and tasks

- Every command in the PRD coverage table is registered in `package.json` `contributes.commands`
  with a `%key%` title and a `category` of `Asili`, so the palette reads "Asili: Jenga mradi".
- Most commands that run a CLI process use a VS Code task (`ProcessExecution`, cwd = the folder holding
  `pata.toml`, found by the same walk as `pata_config::find_project_root`), so output, exit codes
  and re-run come from VS Code for free.
- `contributes.taskDefinitions` adds type `pata` with properties `amri` (command) and `chagua`
  (flags); `tasks.ts` provides one task per common command so they appear under "Run Task".
- Build target and mode are a workspace-state setting (`asili.lengo`, `asili.namna`) shown in the
  status bar and passed as `--lengo` and `--namna`.
- `.asb` files get an explorer context menu "Tenda" running `pata tenda <file>`.

## Testing

- `TestController` discovers tests per project with `pata jaribu --orodha --json` and refreshes
  after source changes.
- A run uses `pata jaribu --json --chuja <name>`. The CLI routes test-program output to stderr in
  JSON mode, leaving machine-readable results on stdout; the Asili CLI integration test covers this.
- Coverage runs `pata jaribu --chanjo --json`, displays aggregate statement counts and test totals,
  and keeps the full JSON in an output channel. The CLI aggregates line numbers across source
  files, so the extension does not fabricate file-specific `FileCoverage` decorations. Add them
  only after the CLI reports file-qualified executed/total line sets.
- The Mwalimu code lens for tests stays, but calls the Testing API instead of a terminal.

## Debugger

- `contributes.debuggers` type `asili`, label "Asili", with launch configuration attributes
  `program` (default: the project in the workspace), `args`, `cwd`, and initial configurations and
  snippets.
- `DebugAdapterDescriptorFactory` returns a `DebugAdapterExecutable` for the resolved `pata-dap`.
  Bundle it per platform; `asili.debuggerPath` can override the bundled binary, with `PATH` as a
  fallback.
- `contributes.breakpoints` for language `asili`.
- **Implemented and exercised:** initialize, launch, source breakpoints, continue, step-over,
  step-in, step-out, pause-at-next-statement, stackTrace, scopes, variables, evaluate, setVariable,
  restart, and disconnect. Evaluate resolves visible locals and numeric/boolean literals;
  setVariable updates visible numeric and boolean locals. Breakpoint/step/pause stops and continues
  are sent as DAP events, and the DAP integration test verifies a real breakpoint, local mutation,
  and restart.
- **Still out of scope:** attach, conditional breakpoints, multi-frame stack traces, and forwarding
  program output to the debug console. The server does not advertise unsupported initialize
  capabilities; do not describe these features as available.

## CLI requirements this extension depends on

Work in the Asili repo, filed as issues there:

| Need | Implemented behavior |
| --- | --- | --- |
| Help for commands | Commands expose Swahili help via `--msaada`. |
| Test JSON | `jaribu --json` keeps test-program output off stdout. |
| Build diagnostics | `jenga --json` emits structured results/errors and artifact paths; unknown flags are rejected. |
| Coverage format | `jaribu --chanjo --json` provides aggregate coverage. Per-file editor decorations remain out of scope until the CLI reports file-qualified lines. |
| Lint entry point | Prefer `pata kagua`; use configured `pata-lint` when the CLI lacks that command. |
| Formatting | `pata nadhifu` is the CLI formatter; `--diff` and `--kagua` are supported. |

## Localisation

- `package.nls.json` (English) and `package.nls.sw.json` (Swahili) for everything in `package.json`.
- `vscode.l10n.t()` for runtime strings, with `l10n/bundle.l10n.sw.json`.
- Swahili strings follow the project's `swahili-docs-and-errors` conventions; English is the
  translation.

## Build, test, release

- Keep esbuild bundling and `npm run build-tools`, which builds `pata-lsp` and `pata-dap` from an
  Asili checkout.
- `npm test` runs manifest checks and `@vscode/test-electron` integration tests, including the
  debugger breakpoint/locals smoke test.
- `cargo test -p pata-dap` covers DAP request behavior and evaluator pause/step controls.
- CI (`.github/workflows/ci.yml`) builds, tests, and packages on Linux, macOS, and Windows; the
  grammar word-list check runs against the checked-out Asili compiler. A successful CI run for the
  current changes is still required before claiming cross-platform verification.
- `npm run package` passes the detected platform target to VSCE, producing a platform-specific
  VSIX. Publishing to Marketplace/Open VSX still requires publisher credentials and a release
  decision; no credentials are stored in the repository.
