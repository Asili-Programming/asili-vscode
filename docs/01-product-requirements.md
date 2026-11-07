# Asili VS Code extension — Product Requirements Document

As of 7 November 2026 · Victor Kaiuki

Every Pata tool and every Mwalimu (LSP) feature should be reachable from VS Code without opening a
terminal: from the Command Palette, the status bar, CodeLens, tasks and the debugger. Today the
extension exposes three commands.

## Problem and goals

The extension (v0.2.0) gives syntax highlighting, snippets, the Mwalimu language server and three
commands: Run Test, Lint Current File, Lint Workspace. Everything else Pata does needs a terminal:
building, running, formatting a project, checking a project, creating one, managing dependencies,
the REPL, tracing, coverage and debugging. `pata-dap` exists but the extension registers no
debugger. Run Test was broken until 7 November 2026: it sent `pata jaribu --filter`, which the CLI
rejects (`kosa: hoja isiyotambuliwa kwenye jaribu: --filter`); it now sends `--chuja` (VS-1, done).

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
| `pata jenga` | Build project or file | None | Command, task, status bar build button |
| `pata jenga --tenda` | Build and run `kuu` | None | Command, CodeLens on `kazi kuu`, task |
| `jenga --namna release` | Release build | None | Command option (quick pick) |
| `jenga --lengo native/wasm/cortex-m` | Build target | None | Quick pick, remembered per workspace |
| `jenga --workspace-info` | Workspace members | None | Command, shown in an output panel |
| `jenga --muda` | Phase timings | None | Command option |
| `pata tenda` | Run a built `.asb` | None | Explorer context menu on `.asb` files |
| `--fuatilia`, `pata fuatilia` | Trace build and run; read a trace | None | Command "run with trace", trace opened as a tree view |
| `pata jaribu` | Run tests | Run Test CodeLens (terminal) | Testing API (Test Explorer), CodeLens per test, `--chuja` |
| `jaribu --chanjo` | Coverage | None | "Run tests with coverage", shown with the Testing API coverage view |
| `jaribu --orodha`, `--json` | List tests, machine output | None | Used by the Test Explorer to discover tests |
| `pata nadhifu` | Format | Via LSP format only | Format document (LSP), command "format project", `--kagua` check |
| `pata kagua` | Lint (replaced the `pata-lint` binary) | Two commands running `pata kagua` in a terminal | Diagnostics in Problems, commands kept, `--makosa-tu` setting |
| `pata thibitisha` | Verify project | None | Command, task |
| `pata njozi` | New project (`--maktaba`, `--workspace`, `--kiasi`) | None | Command with quick picks, opens the new folder |
| `pata ongeza`, `pata ondoa` | Add or remove dependency (`--git`, `--tawi`, `--toleo`) | None | Commands; CodeLens in `pata.toml` |
| `pata repl` | REPL | None | Command opens REPL terminal |
| `pata mwalimu` / `pata-lsp` | Language server | Started on activation | Restart command, status in status bar |
| `pata-dap` | Debugger | None | Debug type `asili`, launch configurations, F5 |
| `tenda` | Standalone runner | None | v2: used by "run artifact" when `pata` is absent |

Mwalimu features already delivered through LSP (must stay on and be listed in the walkthrough):
diagnostics, hover, completion, signature help, go to definition, find references, rename,
document and workspace symbols, highlights, folding, semantic tokens, inlay hints, code actions,
code lens, formatting.

## Scope

**v1:** the coverage table above, the debugger with everything `pata-dap` implements (breakpoints,
continue, step over, step in, step out, pause, evaluate, set variable, restart), Swahili and
English localisation, a walkthrough, and publishing to the VS Code Marketplace and Open VSX.

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
| VS-10 | Coverage results shown in the editor | Should | v1 |
| VS-11 | Trace output shown as a tree view | Could | v1 |
| VS-12 | Step over, step in, step out, pause, evaluate, set variable, restart (all supported by `pata-dap` since Asili `9e76e6f`) | Must | v1 |

## Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| VS-NFR-1 | Startup | Activates only on Asili files or a `pata.toml`; activation under 500 ms excluding the LSP spawn |
| VS-NFR-2 | Language | All user-facing strings in `package.nls.json` (English) and `package.nls.sw.json` (Swahili) plus `l10n/` bundles; Swahili follows the project's conventions |
| VS-NFR-3 | Tool resolution | One function resolves every tool: setting, then bundled binary, then `PATH` |
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

## Open questions

- [ ] Bundle `pata-dap` beside `pata-lsp`, or require it on `PATH`?
- [ ] Marketplace publisher name, and whether to publish under the Asili-Programming org.

Settled: linting is the `pata kagua` subcommand (Asili `4bfe016`), so the extension calls one CLI
for everything; the lint commands already use it and `asili.linterPath` is gone.
