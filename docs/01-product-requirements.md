# Asili VS Code extension — Product Requirements Document

As of 10 November 2026 · Victor Kaiuki

Every in-scope Pata workflow and Mwalimu (LSP) feature should be reachable from VS Code through the
Command Palette, status bar, CodeLens, tasks, Testing view and debugger. The v0.5.0 implementation
has commands, tasks, language support, testing, tracing and debugging; platform CI verification
and store publication remain release work.

## Problem and goals

The initial extension lacked most Pata workflows and did not register a debugger. The current
implementation addresses those gaps with commands, tasks, Testing API integration, trace
exploration and a `pata-dap` debugger. Run Test now uses the supported `--chuja` flag (VS-1, done).

Goals:

1. **Every tool reachable.** Each Pata command and standalone tool has at least one editor surface
   (table below), with no terminal typing.
2. **Every feature visible.** Every Mwalimu capability is on by default, discoverable from a
   walkthrough, and switchable in settings.
3. **Swahili first.** Command titles, settings, messages and the walkthrough read in Swahili, with
   English when VS Code runs in English.

## Audiences

| Audience | Needs | Success looks like |
| --- | --- | --- |
| Learner writing a first project | Run and test without learning CLI flags | Creates a project and runs it from the palette |
| Working Asili developer | Fast edit, test, debug loop | Sets a breakpoint, steps, inspects a value |
| Embedded developer | Build for `cortex-m` and `wasm` targets | Picks a target from a list and builds |
| Contributor to Asili | Trace and timings to see what the compiler did | Opens a trace tree from a run |

## Tool coverage

Every row must have a surface in v1 unless marked v2. "Today" is what v0.2.0 does.

| Pata tool | What it does | Today | Required surface |
| --- | --- | --- | --- |
| `pata jenga` | Build project or file | Command, task, status-bar action |
| `pata jenga --tenda` | Build and run `kuu` | Command, CodeLens, task |
| `jenga --namna release` | Release build | Build-mode quick pick |
| `jenga --lengo native/wasm/cortex-m` | Build target | Workspace-persisted target quick pick |
| `jenga --workspace-info` | Workspace members | Command and output panel |
| `jenga --muda` | Phase timings | Build-timings command |
| `pata tenda` | Run a built `.asb` | Explorer context menu and command |
| `--fuatilia`, `pata fuatilia` | Trace build/run; read trace | Run-with-trace command; decoded trace tree |
| `pata jaribu` | Run tests | Test Explorer, CodeLens, command and task |
| `jaribu --chanjo --json` | Coverage summary | Testing view and Asili Coverage output channel |
| `jaribu --orodha`, `--json` | List tests, machine output | Test Explorer discovery |
| `pata nadhifu` | Format | LSP document formatting, project format and check commands |
| `pata kagua` | Lint | File/workspace commands; uses `pata-lint` compatibility fallback |
| `pata thibitisha` | Verify project | Command and task |
| `pata njozi` | New project (`--maktaba`, `--workspace`, `--kiasi`) | Guided command and open-folder action |
| `pata ongeza`, `pata ondoa` | Manage dependencies | Commands and `pata.toml` CodeLens/context actions |
| `pata repl` | REPL | Command opens integrated terminal |
| `pata mwalimu` / `pata-lsp` | Language server | Activation, status bar and restart command |
| `pata-dap` | Debugger | `asili` launch configuration, F5 and breakpoint support |
| `tenda` | Standalone runner | v2: fallback when `pata` is absent |

Mwalimu features already delivered through LSP (must stay on and be listed in the walkthrough):
diagnostics, hover, completion, signature help, go to definition, find references, rename,
document and workspace symbols, highlights, folding, semantic tokens, inlay hints, code actions,
code lens, formatting.

## Scope

**v1:** the coverage table above, the debugger features promised by VS-5/VS-12 (breakpoints,
continue, step over, step in, step out, pause, evaluate, set variable, restart), Swahili and
English localisation, a walkthrough, and publishing to the VS Code Marketplace and Open VSX.
The current implementation does not yet satisfy all of v1: debugger evaluate/setVariable/restart,
cross-platform CI validation, final manual UX verification, and store publication remain open.

**v2:** `tenda` fallback; a trace visualiser beyond a tree; debugger features `pata-dap` does not
have yet (conditional breakpoints, a multi-frame call stack, program output in the debug console).

**Out of scope:** other editors (the LSP and DAP servers already serve them); bundling the whole
Pata CLI inside the extension.

## Functional requirements

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| VS-1 | Run Test uses `--chuja` and works | Must | v1 |
| VS-2 | One command per row of the coverage table, titled in Swahili with an English translation | Must | v1 |
| VS-3 | Tests appear in the Test Explorer, discovered with `pata jaribu --orodha --json` | Must | v1 |
| VS-4 | A `pata` task type covers jenga, tenda, jaribu, nadhifu, thibitisha | Must | v1 |
| VS-5 | Debug type `asili` launches `pata-dap`; breakpoints, continue, call stack and variables work | Must | v1 |
| VS-6 | Status bar shows Mwalimu state and the build target; clicking it offers the main actions | Must | v1 |
| VS-7 | When `pata` or a tool is missing, one notification explains how to install it, with a link | Must | v1 |
| VS-8 | A walkthrough introduces run, test, debug, format, lint and each LSP feature | Should | v1 |
| VS-9 | New project and add dependency are guided with quick picks | Should | v1 |
| VS-10 | Aggregate coverage summary shown in task output | Should | v1 |
| VS-11 | Trace output shown as a tree view | Could | v1 |
| VS-12 | Step over, step in, step out, pause, evaluate, set variable, restart | Must | v1 |

## Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| VS-NFR-1 | Startup | Activates only on Asili files or a `pata.toml`; activation under 500 ms excluding the LSP spawn |
| VS-NFR-2 | Language | All user-facing strings in `package.nls.json` (English) and `package.nls.sw.json` (Swahili) plus `l10n/` bundles; Swahili follows the project's conventions |
| VS-NFR-3 | Tool resolution | Centralized per-tool resolution: configured path, bundled binary where available, then `PATH` |
| VS-NFR-4 | Machine output | The extension reads `--json` output where the CLI offers it, never scrapes human text |
| VS-NFR-5 | Accessibility | Every command reachable from the keyboard; no information only in colour |
| VS-NFR-6 | Compatibility | VS Code 1.145 or newer (current `engines.vscode`); Linux, macOS, Windows |

## Success metrics

| Metric | Source | Target |
| --- | --- | --- |
| Pata commands with an editor surface | The coverage table | 100% of v1 rows |
| Mwalimu capabilities listed in the walkthrough | Walkthrough vs. server capabilities | All |
| Marketplace and Open VSX installs | Publisher dashboards | Tracked from first publish |
| Open bugs labelled `vscode` older than 30 days | GitHub issues | 0 |

## Decisions

- Bundle `pata-dap` per platform. Allow `asili.debuggerPath` to override the bundled binary, with
  `PATH` as a fallback.
- Keep the existing `asili` Marketplace publisher; do not migrate publisher ownership as part of
  this work.
- Use `pata kagua` when the selected CLI provides it; otherwise use `pata-lint` through
  `asili.linterPath` for compatibility with older installations.
