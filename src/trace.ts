import { execFile } from "child_process";
import {
  Event,
  EventEmitter,
  l10n,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { resolveCli } from "./tools";

export interface TraceNode {
  label: string;
  children: TraceNode[];
}

export class TraceProvider implements TreeDataProvider<TraceNode> {
  private readonly changed = new EventEmitter<TraceNode | undefined>();
  private roots: TraceNode[] = [];

  readonly onDidChangeTreeData: Event<TraceNode | undefined> = this.changed.event;

  getTreeItem(node: TraceNode): TreeItem {
    return new TreeItem(
      node.label,
      node.children.length
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );
  }

  getChildren(node?: TraceNode): TraceNode[] {
    return node ? node.children : this.roots;
  }

  async load(file: string): Promise<void> {
    const output = await new Promise<string>((resolve, reject) => {
      execFile(
        resolveCli(),
        ["fuatilia", file],
        { windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr.trim() || error.message));
            return;
          }
          resolve(stdout);
        }
      );
    });

    this.roots = this.parse(output);
    this.changed.fire(undefined);
  }

  clear(): void {
    this.roots = [{ label: l10n.t("Choose a binary trace to inspect"), children: [] }];
    this.changed.fire(undefined);
  }

  private parse(text: string): TraceNode[] {
    const roots: TraceNode[] = [];
    const stack: TraceNode[] = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }
      const event = line.match(/^(\s*)└──\s+(.*)$/);
      const depth = event ? Math.floor(event[1].length / 2) : 0;
      const node: TraceNode = { label: event?.[2] ?? line.trim(), children: [] };
      if (depth === 0 || !stack[depth - 1]) {
        roots.push(node);
      } else {
        stack[depth - 1].children.push(node);
      }
      stack.length = depth;
      stack[depth] = node;
    }
    return roots.length ? roots : [{ label: l10n.t("Trace is empty"), children: [] }];
  }
}
