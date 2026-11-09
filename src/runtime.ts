import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  env,
  commands,
  l10n,
  ProcessExecution,
  Task,
  TaskScope,
  Uri,
  window,
  workspace,
} from "vscode";
import { resolveCli, resolveLinter } from "./tools";

let cliAvailable: Promise<boolean> | undefined;
let supportsKagua: Promise<boolean> | undefined;

export function resetToolAvailability(): void {
  cliAvailable = undefined;
  supportsKagua = undefined;
}

export interface PataTaskDefinition {
  type: "pata";
  args: string[];
  cwd?: string;
  label?: string;
  executable?: string;
}

export async function ensurePataAvailable(): Promise<boolean> {
  if (!cliAvailable) {
    cliAvailable = new Promise((resolve) => {
      execFile(resolveCli(), ["--toleo"], { windowsHide: true }, (error) => {
        resolve(!error || error.code !== "ENOENT");
      });
    });
  }
  if (await cliAvailable) {
    return true;
  }
  cliAvailable = undefined;
  const action = await window.showErrorMessage(
    l10n.t("Pata CLI was not found. Install Pata or configure its executable path."),
    l10n.t("Installation guide"),
    l10n.t("Configure path")
  );
  if (action === l10n.t("Installation guide")) {
    await env.openExternal(Uri.parse("https://github.com/Asili-Programming/Asili#installation"));
  } else if (action === l10n.t("Configure path")) {
    await commandsOpenSetting();
  }
  return false;
}

async function ensureToolAvailable(command: string, setting: string, displayName: string): Promise<boolean> {
  const found = await new Promise<boolean>((resolve) => {
    execFile(command, ["--help"], { windowsHide: true }, (error) => {
      resolve(!error || error.code !== "ENOENT");
    });
  });
  if (found) {
    return true;
  }
  const action = await window.showErrorMessage(
    l10n.t("{0} was not found. Install it or configure its executable path.", displayName),
    l10n.t("Installation guide"),
    l10n.t("Configure path")
  );
  if (action === l10n.t("Installation guide")) {
    await env.openExternal(Uri.parse("https://github.com/Asili-Programming/Asili#installation"));
  } else if (action === l10n.t("Configure path")) {
    await commands.executeCommand("workbench.action.openSettings", `asili.${setting}`);
  }
  return false;
}

async function cliSupportsKagua(): Promise<boolean> {
  if (!supportsKagua) {
    supportsKagua = new Promise((resolve) => {
      execFile(resolveCli(), ["msaada"], { windowsHide: true }, (_error, stdout) => {
        resolve(/\bkagua\b/.test(stdout));
      });
    });
  }
  return supportsKagua;
}

export async function createLintTask(
  args: string[],
  label: string,
  cwd = activeProjectRoot()
): Promise<Task | undefined> {
  if (!(await ensurePataAvailable())) {
    return undefined;
  }
  if (await cliSupportsKagua()) {
    return createPataTask(["kagua", ...args], label, cwd);
  }
  const linter = resolveLinter();
  if (!(await ensureToolAvailable(linter, "linterPath", "pata-lint"))) {
    return undefined;
  }
  return createPataTask(args, label, cwd, linter);
}

async function commandsOpenSetting(): Promise<void> {
  await commands.executeCommand("workbench.action.openSettings", "asili.cliPath");
}

export function findProjectRoot(start: string): string {
  let directory = start;
  for (;;) {
    if (fs.existsSync(path.join(directory, "pata.toml"))) {
      return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return start;
    }
    directory = parent;
  }
}

export function activeProjectRoot(): string | undefined {
  const editor = window.activeTextEditor?.document.uri.fsPath;
  const start = editor ?? workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!start) {
    return undefined;
  }
  const isDirectory = fs.existsSync(start) && fs.statSync(start).isDirectory();
  return findProjectRoot(isDirectory ? start : path.dirname(start));
}

export function createPataTask(
  args: string[],
  label: string,
  cwd = activeProjectRoot(),
  executable = resolveCli()
): Task {
  const folder = workspace.workspaceFolders?.find((item) => item.uri.fsPath === cwd);
  const scope = folder ?? TaskScope.Workspace;
  const definition: PataTaskDefinition = { type: "pata", args, cwd, label, executable };
  const execution = new ProcessExecution(executable, args, {
    cwd,
  });
  return new Task(definition, scope, label, "Asili", execution);
}
