import * as path from "path";
import * as fs from "fs";
import {
  commands,
  DebugConfiguration,
  debug,
  ExtensionContext,
  l10n,
  tasks,
  TaskProvider,
  TaskDefinition,
  TaskScope,
  Uri,
  window,
  workspace,
} from "vscode";
import {
  activeProjectRoot,
  createLintTask,
  createPataTask,
  ensurePataAvailable,
  findProjectRoot,
} from "./runtime";

const taskCommands: Array<{ label: string; args: string[] }> = [
  { label: "Build project", args: ["jenga"] },
  { label: "Build and run", args: ["jenga", "--tenda"] },
  { label: "Run tests", args: ["jaribu"] },
  { label: "Format project", args: ["nadhifu"] },
  { label: "Verify project", args: ["thibitisha"] },
];

async function executePata(args: string[], label: string, cwd?: string): Promise<void> {
  if (!(await ensurePataAvailable())) {
    return;
  }
  const task = createPataTask(args, label, cwd ?? activeProjectRoot());
  await tasks.executeTask(task);
}

async function executeLint(args: string[], label: string, cwd?: string): Promise<void> {
  const task = await createLintTask(args, label, cwd ?? activeProjectRoot());
  if (task) {
    await tasks.executeTask(task);
  }
}

function currentFile(): string | undefined {
  const document = window.activeTextEditor?.document;
  return document?.languageId === "asili" ? document.uri.fsPath : undefined;
}

function projectRootFor(uri?: Uri): string | undefined {
  const file = uri?.fsPath ?? currentFile();
  return file ? findProjectRoot(path.dirname(file)) : activeProjectRoot();
}

async function chooseBuildTarget(context: ExtensionContext): Promise<string | undefined> {
  const targets = ["native", "wasm", "cortex-m", "esp32"];
  const selected = await window.showQuickPick(targets, {
    placeHolder: l10n.t("Select a build target"),
  });
  if (selected) {
    await context.workspaceState.update("asili.buildTarget", selected);
    commands.executeCommand("asili.refreshStatus");
  }
  return selected;
}

async function chooseBuildMode(context: ExtensionContext): Promise<string | undefined> {
  const selected = await window.showQuickPick(["dev", "release"], {
    placeHolder: l10n.t("Select a build mode"),
  });
  if (selected) {
    await context.workspaceState.update("asili.buildMode", selected);
    commands.executeCommand("asili.refreshStatus");
  }
  return selected;
}

function buildArgs(
  context: ExtensionContext,
  run = false,
  sourceFile = currentFile(),
  root = projectRootFor()
): string[] {
  const target = context.workspaceState.get<string>("asili.buildTarget", "native");
  const mode = context.workspaceState.get<string>("asili.buildMode", "dev");
  const args = ["jenga", ...(run ? ["--tenda"] : []), "--namna", mode, "--lengo", target];
  if (sourceFile && root && !fs.existsSync(path.join(root, "pata.toml"))) {
    args.splice(1, 0, sourceFile);
  }
  return args;
}

async function executePataAndWait(args: string[], label: string, cwd?: string): Promise<number | undefined> {
  if (!(await ensurePataAvailable())) {
    return undefined;
  }
  const task = createPataTask(args, label, cwd ?? activeProjectRoot());
  let listener: { dispose(): void } | undefined;
  const completion = new Promise<number | undefined>((resolve) => {
    listener = tasks.onDidEndTaskProcess((event) => {
      if (event.execution.task === task) {
        listener?.dispose();
        resolve(event.exitCode);
      }
    });
  });
  try {
    await tasks.executeTask(task);
    return await completion;
  } catch (error) {
    listener?.dispose();
    throw error;
  }
}

async function createProject(): Promise<void> {
  const name = await window.showInputBox({
    prompt: l10n.t("Enter a project name"),
    value: "asili-app",
    validateInput: (value) => value.trim() ? undefined : l10n.t("A project name is required"),
  });
  if (!name) {
    return;
  }

  const template = await window.showQuickPick(
    [
      { label: l10n.t("Application"), flag: "--kiasi" },
      { label: l10n.t("Library"), flag: "--maktaba" },
      { label: l10n.t("Workspace"), flag: "--workspace" },
    ],
    { placeHolder: l10n.t("Select a project template") }
  );
  if (!template) {
    return;
  }
  const selected = await window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: l10n.t("Choose project location"),
  });
  if (!selected?.[0]) {
    return;
  }

  const parent = selected[0].fsPath;
  const destination = path.join(parent, name.trim());
  if (!(await ensurePataAvailable())) {
    return;
  }
  const task = createPataTask(["njozi", name.trim(), destination, template.flag], l10n.t("Create Asili project"), parent);
  const execution = await tasks.executeTask(task);
  const listener = tasks.onDidEndTaskProcess((event) => {
    if (event.execution !== execution) {
      return;
    }
    listener.dispose();
    if (event.exitCode === 0) {
      void window.showInformationMessage(
        l10n.t("Project created at {0}", destination),
        l10n.t("Open project")
      ).then((choice) => {
        if (choice) {
          void commands.executeCommand("vscode.openFolder", Uri.file(destination), true);
        }
      });
    }
  });
}

async function addDependency(): Promise<void> {
  const name = await window.showInputBox({ prompt: l10n.t("Enter the dependency name") });
  if (!name?.trim()) {
    return;
  }
  const source = await window.showQuickPick(
    [
      { label: l10n.t("Registry version"), detail: l10n.t("Resolve from the configured registry"), value: "registry" },
      { label: l10n.t("Git repository"), detail: l10n.t("Add from a Git URL"), value: "git" },
    ],
    { placeHolder: l10n.t("Select a dependency source") }
  );
  if (!source) {
    return;
  }
  const args = ["ongeza", name.trim()];
  if (source.value === "git") {
    const url = await window.showInputBox({ prompt: l10n.t("Enter the Git repository URL") });
    if (!url?.trim()) {
      return;
    }
    args.push("--git", url.trim());
    const branch = await window.showInputBox({ prompt: l10n.t("Optional branch name (leave empty for the default branch)") });
    if (branch?.trim()) {
      args.push("--tawi", branch.trim());
    }
  } else {
    const version = await window.showInputBox({
      prompt: l10n.t("Optional semantic version constraint"),
      placeHolder: "^1.2",
    });
    if (version?.trim()) {
      args.push("--toleo", version.trim());
    }
  }
  await executePata(args, l10n.t("Add dependency"));
}

async function startDebugging(uri?: Uri): Promise<void> {
  const program = uri?.fsPath ?? currentFile();
  const root = projectRootFor(uri);
  const folder = root
    ? workspace.workspaceFolders?.find((item) => item.uri.fsPath === root)
    : workspace.workspaceFolders?.[0];
  const configuration: DebugConfiguration = {
    type: "asili",
    request: "launch",
    name: l10n.t("Debug Asili program"),
    program: program ?? "${workspaceFolder}/src/kuu.as",
    cwd: root ?? "${workspaceFolder}",
    args: [],
  };
  await debug.startDebugging(folder, configuration);
}

export function registerCommands(context: ExtensionContext): void {
  const registrations = [
    commands.registerCommand("asili.build", async (uri?: Uri) => {
      if (!(await chooseBuildMode(context))) {
        return;
      }
      await executePata(
        buildArgs(context, false, uri?.fsPath ?? currentFile(), projectRootFor(uri)),
        l10n.t("Build Asili project")
      );
    }),
    commands.registerCommand("asili.run", async (uri?: Uri) => {
      const target = uri?.fsPath ?? currentFile();
      const root = projectRootFor(uri);
      const args = buildArgs(context, true, target, root);
      await executePata(args, l10n.t("Build and run Asili project"), root);
    }),
    commands.registerCommand("asili.runWithTrace", async () => {
      const root = activeProjectRoot();
      if (!root) {
        void window.showWarningMessage(l10n.t("Open a project folder first"));
        return;
      }
      const trace = await window.showSaveDialog({
        defaultUri: Uri.file(path.join(root, "asili.trace")),
        filters: { [l10n.t("Binary traces")]: ["trace", "bin"] },
      });
      if (!trace) {
        return;
      }
      const args = [
        ...buildArgs(context, true),
        `--fuatilia=binari:${trace.fsPath}`,
      ];
      const exitCode = await executePataAndWait(args, l10n.t("Build and run with tracing"), root);
      if (exitCode === 0) {
        await commands.executeCommand("asili.showTrace", trace.fsPath);
      }
    }),
    commands.registerCommand("asili.selectTarget", () => chooseBuildTarget(context)),
    commands.registerCommand("asili.selectMode", () => chooseBuildMode(context)),
    commands.registerCommand("asili.buildTimings", () =>
      executePata(
        [
          "jenga",
          "--muda",
          "--namna",
          context.workspaceState.get<string>("asili.buildMode", "dev"),
          "--lengo",
          context.workspaceState.get<string>("asili.buildTarget", "native"),
        ],
        l10n.t("Show build timings")
      )
    ),
    commands.registerCommand("asili.test", () => executePata(["jaribu"], l10n.t("Run Asili tests"))),
    commands.registerCommand("asili.testCoverage", () =>
      executePata(["jaribu", "--chanjo", "--json"], l10n.t("Run tests with coverage"))
    ),
    commands.registerCommand("asili.formatProject", () =>
      executePata(["nadhifu"], l10n.t("Format Asili project"))
    ),
    commands.registerCommand("asili.formatCheck", () =>
      executePata(["nadhifu", "--kagua", "--json"], l10n.t("Check Asili formatting"))
    ),
    commands.registerCommand("asili.verify", () =>
      executePata(["thibitisha", "--json"], l10n.t("Verify Asili project"))
    ),
    commands.registerCommand("asili.newProject", createProject),
    commands.registerCommand("asili.addDependency", addDependency),
    commands.registerCommand("asili.removeDependency", async (dependency?: string) => {
      const name = dependency ?? await window.showInputBox({
        prompt: l10n.t("Enter the dependency name to remove"),
      });
      if (name?.trim()) {
        await executePata(["ondoa", name.trim()], l10n.t("Remove dependency"));
      }
    }),
    commands.registerCommand("asili.repl", async () => {
      await executePata(["repl"], l10n.t("Open Asili REPL"));
    }),
    commands.registerCommand("asili.workspaceInfo", () =>
      executePata(["jenga", "--workspace-info"], l10n.t("Show workspace members"))
    ),
    commands.registerCommand("asili.runArtifact", async (uri?: Uri) => {
      const artifact = uri ?? (await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { [l10n.t("Asili artifacts")]: ["asb", "manifest"] },
      }))?.[0];
      if (artifact) {
        await executePata(["tenda", artifact.fsPath], l10n.t("Run Asili artifact"));
      }
    }),
    commands.registerCommand("asili.openTrace", async () => {
      const trace = (await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { [l10n.t("Binary traces")]: ["trace", "bin"] },
      }))?.[0];
      if (trace) {
        await commands.executeCommand("asili.showTrace", trace.fsPath);
      }
    }),
    commands.registerCommand("asili.debug", (uri?: Uri) => startDebugging(uri)),
    commands.registerCommand("asili.lintFile", async (uri?: Uri) => {
      const file = uri?.fsPath ?? currentFile();
      if (file) {
        await executeLint([file], l10n.t("Lint current file"), projectRootFor(uri));
      } else {
        void window.showWarningMessage(l10n.t("Open an Asili source file first"));
      }
    }),
    commands.registerCommand("asili.lintWorkspace", () =>
      executeLint([], l10n.t("Lint workspace"))
    ),
    commands.registerCommand("asili.runTest", (uriString: string, testName: string) => {
      const root = findProjectRoot(path.dirname(Uri.parse(uriString).fsPath));
      return executePata(
        ["jaribu", "--chuja", testName],
        l10n.t("Run test: {0}", testName),
        root
      );
    }),
  ];

  context.subscriptions.push(...registrations);

  const provider: TaskProvider = {
    provideTasks: () =>
      taskCommands.map((item) => createPataTask(item.args, `pata: ${item.label}`)),
    resolveTask: (task) => {
      const definition: TaskDefinition = task.definition;
      if (
        definition.type !== "pata" ||
        !Array.isArray(definition.args) ||
        !definition.args.every((arg) => typeof arg === "string")
      ) {
        return undefined;
      }
      const args = definition.args;
      const cwd = typeof definition.cwd === "string" ? definition.cwd : undefined;
      const executable = typeof definition.executable === "string" ? definition.executable : undefined;
      const label = typeof definition.label === "string"
        ? definition.label
        : `pata: ${args.join(" ")}`;
      return createPataTask(args, label, cwd, executable);
    },
  };
  context.subscriptions.push(tasks.registerTaskProvider("pata", provider));
}

export function projectRootFromDocument(uri: Uri): string {
  return findProjectRoot(path.dirname(uri.fsPath));
}

export function buildTarget(context: ExtensionContext): string {
  return context.workspaceState.get<string>("asili.buildTarget", "native");
}
