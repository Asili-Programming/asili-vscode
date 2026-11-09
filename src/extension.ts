import { execFile } from "child_process";
import {
  CodeLens,
  commands,
  debug,
  DebugAdapterDescriptorFactory,
  DebugAdapterExecutable,
  env,
  ExtensionContext,
  l10n,
  languages,
  OutputChannel,
  Position,
  Range,
  StatusBarAlignment,
  StatusBarItem,
  TextDocument,
  ThemeColor,
  Uri,
  window,
  workspace,
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  State,
} from "vscode-languageclient/node";
import { buildTarget, registerCommands } from "./commands";
import { registerTesting } from "./testing";
import { ensurePataAvailable, resetToolAvailability } from "./runtime";
import { resolveCli, resolveDebugger, resolveLanguageServer } from "./tools";
import { TraceProvider } from "./trace";

let client: LanguageClient | undefined;
let statusItem: StatusBarItem | undefined;
let toolsOutput: OutputChannel | undefined;

function updateStatus(state: "starting" | "running" | "stopped", context: ExtensionContext): void {
  if (!statusItem) {
    return;
  }
  const icon = state === "running" ? "$(check)" : state === "starting" ? "$(sync~spin)" : "$(warning)";
  const label =
    state === "running"
      ? l10n.t("Ready")
      : state === "starting"
        ? l10n.t("Starting")
        : l10n.t("Stopped");
  statusItem.text = `${icon} Mwalimu · ${buildTarget(context)}`;
  statusItem.tooltip = l10n.t("Mwalimu: {0}. Build target: {1}. Click for Asili actions.", label, buildTarget(context));
  statusItem.backgroundColor =
    state === "stopped" ? new ThemeColor("statusBarItem.warningBackground") : undefined;
  statusItem.show();
}

function startLanguageClient(context: ExtensionContext): LanguageClient {
  const tool = resolveLanguageServer(context);
  const executable: ServerOptions = { command: tool.command, args: tool.args };
  const options: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "asili" },
      { scheme: "file", language: "pata-manifest" },
    ],
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher("**/*.as"),
        workspace.createFileSystemWatcher("**/pata.toml"),
        workspace.createFileSystemWatcher("**/pata.lock"),
      ],
    },
  };
  const next = new LanguageClient("asiliLsp", "Asili (Mwalimu)", executable, options);
  next.onDidChangeState((event) => {
    updateStatus(
      event.newState === State.Running
        ? "running"
        : event.newState === State.Stopped
          ? "stopped"
          : "starting",
      context
    );
  });
  client = next;
  void next.start().catch((error: unknown) => {
    updateStatus("stopped", context);
    void window
      .showErrorMessage(
        l10n.t("Mwalimu could not start: {0}", error instanceof Error ? error.message : String(error)),
        l10n.t("Installation guide"),
        l10n.t("Configure path")
      )
      .then(async (action) => {
        if (action === l10n.t("Installation guide")) {
          await env.openExternal(Uri.parse("https://github.com/Asili-Programming/Asili#installation"));
        } else if (action === l10n.t("Configure path")) {
          await commands.executeCommand("workbench.action.openSettings", "asili.serverPath");
        }
      });
  });
  return next;
}

function registerMainCodeLens(context: ExtensionContext): void {
  context.subscriptions.push(
    languages.registerCodeLensProvider(
      { language: "asili" },
      {
        provideCodeLenses(document: TextDocument) {
          const text = document.getText();
          const lenses: CodeLens[] = [];
          const pattern = /^\s*(?:pub\s+)?kazi\s+kuu\b/gm;
          for (const match of text.matchAll(pattern)) {
            const line = document.positionAt(match.index ?? 0).line;
            const range = new Range(new Position(line, 0), new Position(line, 0));
            lenses.push(
              new CodeLens(range, {
                title: l10n.t("Run"),
                command: "asili.run",
                arguments: [document.uri],
              }),
              new CodeLens(range, {
                title: l10n.t("Debug"),
                command: "asili.debug",
                arguments: [document.uri],
              })
            );
          }
          return lenses;
        },
      }
    )
  );
}

function registerManifestCodeLens(context: ExtensionContext): void {
  context.subscriptions.push(
    languages.registerCodeLensProvider(
      { language: "pata-manifest" },
      {
        provideCodeLenses(document: TextDocument): CodeLens[] {
          const lenses: CodeLens[] = [];
          let inDependencies = false;
          for (const [lineNumber, line] of document.getText().split(/\r?\n/).entries()) {
            const section = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
            if (section) {
              inDependencies = section[1] === "tegemezi";
              if (inDependencies) {
                const range = new Range(new Position(lineNumber, 0), new Position(lineNumber, 0));
                lenses.push(
                  new CodeLens(range, {
                    title: l10n.t("Add dependency"),
                    command: "asili.addDependency",
                  })
                );
              }
              continue;
            }
            if (!inDependencies || /^\s*(?:#|$)/.test(line)) {
              continue;
            }
            const dependency = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/)?.[1];
            if (dependency) {
              const range = new Range(new Position(lineNumber, 0), new Position(lineNumber, 0));
              lenses.push(
                new CodeLens(range, {
                  title: l10n.t("Remove dependency"),
                  command: "asili.removeDependency",
                  arguments: [dependency],
                })
              );
            }
          }
          return lenses;
        },
      }
    )
  );
}

async function showTools(context: ExtensionContext): Promise<void> {
  toolsOutput ??= window.createOutputChannel("Asili Tools");
  const output = toolsOutput;
  output.clear();
  output.appendLine(`pata: ${resolveCli()}`);
  const cliPath = resolveCli();
  await new Promise<void>((resolve) => {
    execFile(cliPath, ["--toleo"], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        output.appendLine(l10n.t("Version unavailable: {0}", stderr.trim() || error.message));
      } else {
        output.appendLine(stdout.trim());
      }
      resolve();
    });
  });
  output.appendLine(`pata-lsp: ${resolveLanguageServer(context).command}`);
  output.appendLine(`pata-dap: ${resolveDebugger(context)}`);
  output.show(true);
}

function registerStatusBar(context: ExtensionContext): void {
  toolsOutput = window.createOutputChannel("Asili Tools");
  statusItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
  statusItem.command = "asili.statusMenu";
  context.subscriptions.push(statusItem, toolsOutput);
  updateStatus("starting", context);
  context.subscriptions.push(
    commands.registerCommand("asili.refreshStatus", () => updateStatus(client?.state === State.Running ? "running" : "starting", context)),
    commands.registerCommand("asili.showTools", () => showTools(context)),
    commands.registerCommand("asili.statusMenu", async () => {
      const selected = await window.showQuickPick(
        [
          { label: l10n.t("Build"), command: "asili.build" },
          { label: l10n.t("Run"), command: "asili.run" },
          { label: l10n.t("Run tests"), command: "asili.test" },
          { label: l10n.t("Select build target"), command: "asili.selectTarget" },
          { label: l10n.t("Select build mode"), command: "asili.selectMode" },
          { label: l10n.t("Show build timings"), command: "asili.buildTimings" },
          { label: l10n.t("Show tools"), command: "asili.showTools" },
          { label: l10n.t("Restart Mwalimu"), command: "asili.restartServer" },
        ],
        { placeHolder: l10n.t("Choose an Asili action") }
      );
      if (selected) {
        await commands.executeCommand(selected.command);
      }
    }),
    commands.registerCommand("asili.restartServer", async () => {
      updateStatus("starting", context);
      try {
        await client?.stop();
        startLanguageClient(context);
      } catch (error) {
        updateStatus("stopped", context);
        void window.showErrorMessage(
          l10n.t("Mwalimu could not restart: {0}", error instanceof Error ? error.message : String(error))
        );
      }
    })
  );
}

export function activate(context: ExtensionContext): void {
  const traceProvider = new TraceProvider();
  registerStatusBar(context);
  registerCommands(context);
  registerTesting(context);
  registerMainCodeLens(context);
  registerManifestCodeLens(context);
  context.subscriptions.push(
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("asili.cliPath") || event.affectsConfiguration("asili.linterPath")) {
        resetToolAvailability();
      }
      if (event.affectsConfiguration("asili.serverPath") || event.affectsConfiguration("asili.serverArgs")) {
        void commands.executeCommand("asili.restartServer");
      }
    })
  );
  context.subscriptions.push(
    window.createTreeView("asili.trace", { treeDataProvider: traceProvider }),
    commands.registerCommand("asili.showTrace", async (file: string) => {
      if (!(await ensurePataAvailable())) {
        return;
      }
      try {
        await traceProvider.load(file);
        await commands.executeCommand("asili.trace.focus");
      } catch (error) {
        void window.showErrorMessage(
          l10n.t("Could not read trace: {0}", error instanceof Error ? error.message : String(error))
        );
      }
    })
  );
  traceProvider.clear();
  startLanguageClient(context);
  context.subscriptions.push({
    dispose: () => {
      void client?.stop();
    },
  });

  const factory: DebugAdapterDescriptorFactory = {
    createDebugAdapterDescriptor: () => new DebugAdapterExecutable(resolveDebugger(context)),
  };
  context.subscriptions.push(
    debug.registerDebugAdapterDescriptorFactory("asili", factory)
  );
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
