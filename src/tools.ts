import * as fs from "fs";
import * as path from "path";
import { ExtensionContext, workspace } from "vscode";

export type ToolName = "pata" | "pata-lsp" | "pata-dap";

export interface ResolvedTool {
  command: string;
  args: string[];
}

function configuredPath(setting: string): string | undefined {
  const value = workspace.getConfiguration("asili").get<string>(setting)?.trim();
  return value || undefined;
}

function bundledPath(context: ExtensionContext, name: string): string | undefined {
  const binary = process.platform === "win32" ? `${name}.exe` : name;
  const candidates = [
    context.asAbsolutePath(path.join("bin", `${process.platform}-${process.arch}`, binary)),
    context.asAbsolutePath(path.join("bin", binary)),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

export function resolveCli(): string {
  return configuredPath("cliPath") ?? "pata";
}

export function resolveLinter(): string {
  return configuredPath("linterPath") ?? "pata-lint";
}

export function resolveLanguageServer(context: ExtensionContext): ResolvedTool {
  const configured = configuredPath("serverPath");
  if (configured) {
    return {
      command: configured,
      args: workspace.getConfiguration("asili").get<string[]>("serverArgs") ?? ["mwalimu"],
    };
  }

  const bundled = bundledPath(context, "pata-lsp");
  if (bundled) {
    return { command: bundled, args: [] };
  }

  return { command: "pata", args: ["mwalimu"] };
}

export function resolveDebugger(context: ExtensionContext): string {
  return (
    configuredPath("debuggerPath") ??
    bundledPath(context, "pata-dap") ??
    "pata-dap"
  );
}
