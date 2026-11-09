import { execFile } from "child_process";
import {
  ExtensionContext,
  l10n,
  TestController,
  TestItem,
  TestMessage,
  TestRun,
  TestRunProfileKind,
  Uri,
  tests,
  window,
  workspace,
} from "vscode";
import { projectRootFromDocument } from "./commands";
import { resolveCli } from "./tools";

interface TestList {
  majaribio: string[];
}

interface TestDescriptor {
  name: string;
  root: string;
}

function runCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      resolveCli(),
      args,
      { cwd, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error && !stdout.trim()) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

function parseTestList(value: string): string[] {
  const parsed = JSON.parse(value) as Partial<TestList>;
  if (!Array.isArray(parsed.majaribio) || !parsed.majaribio.every((item) => typeof item === "string")) {
    throw new Error(l10n.t("Pata returned an invalid test list"));
  }
  return parsed.majaribio;
}

function parseTestResults(value: string): Array<{ jina: string; sawa: boolean; ujumbe?: string | null }> {
  const parsed = JSON.parse(value) as {
    majaribio?: Array<{ jina?: unknown; sawa?: unknown; ujumbe?: unknown }>;
  };
  if (!Array.isArray(parsed.majaribio)) {
    throw new Error(l10n.t("Pata returned invalid test results"));
  }
  return parsed.majaribio.map((result) => {
    if (typeof result.jina !== "string" || typeof result.sawa !== "boolean") {
      throw new Error(l10n.t("Pata returned an invalid test result"));
    }
    return {
      jina: result.jina,
      sawa: result.sawa,
      ujumbe: typeof result.ujumbe === "string" ? result.ujumbe : null,
    };
  });
}

export function registerTesting(context: ExtensionContext): void {
  const controller = tests.createTestController("asili.tests", l10n.t("Asili tests"));
  const descriptors = new WeakMap<TestItem, TestDescriptor>();
  const roots = new Map<string, TestItem>();
  const discoveryErrors = new Set<string>();

  const discover = async (root: TestItem): Promise<void> => {
    const rootPath = root.uri?.fsPath;
    if (!rootPath) {
      return;
    }
    try {
      const { stdout } = await runCli(["jaribu", "--orodha", "--json"], rootPath);
      const tests = parseTestList(stdout);
      root.children.replace(
        tests.map((name) => {
          const item = controller.createTestItem(`${rootPath}::${name}`, name);
          descriptors.set(item, { name, root: rootPath });
          return item;
        })
      );
      discoveryErrors.delete(rootPath);
    } catch (error) {
      if (!discoveryErrors.has(rootPath)) {
        discoveryErrors.add(rootPath);
        void window.showErrorMessage(
          l10n.t("Could not discover Asili tests: {0}", error instanceof Error ? error.message : String(error))
        );
      }
    }
  };

  const ensureRoot = (uri: Uri): TestItem => {
    const rootPath = projectRootFromDocument(uri);
    const existing = roots.get(rootPath);
    if (existing) {
      return existing;
    }
    const root = controller.createTestItem(rootPath, rootPath, Uri.file(rootPath));
    roots.set(rootPath, root);
    controller.items.add(root);
    return root;
  };

  controller.resolveHandler = async (item) => {
    if (item) {
      await discover(item);
      return;
    }
    const folders = workspace.workspaceFolders ?? [];
    for (const folder of folders) {
      await discover(ensureRoot(folder.uri));
    }
    const editor = window.activeTextEditor?.document;
    if (editor?.languageId === "asili") {
      await discover(ensureRoot(editor.uri));
    }
  };

  controller.createRunProfile(
    l10n.t("Run"),
    TestRunProfileKind.Run,
    async (request, token) => {
      const run = controller.createTestRun(request);
      const selected: TestItem[] = [];
      const collect = (item: TestItem): void => {
        const descriptor = descriptors.get(item);
        if (descriptor) {
          selected.push(item);
        } else {
          item.children.forEach(collect);
        }
      };
      if (request.include?.length) {
        request.include.forEach(collect);
      } else {
        controller.items.forEach(collect);
      }

      for (const item of selected) {
        if (token.isCancellationRequested) {
          run.skipped(item);
          continue;
        }
        const descriptor = descriptors.get(item);
        if (!descriptor) {
          continue;
        }
        run.started(item);
        const start = Date.now();
        try {
          const { stdout, stderr } = await runCli(
            ["jaribu", "--json", "--chuja", descriptor.name],
            descriptor.root
          );
          const results = parseTestResults(stdout);
          const result = results.find((candidate) => candidate.jina === descriptor.name) ?? results[0];
          if (!result) {
            run.errored(item, new TestMessage(stderr || l10n.t("Pata returned no result for this test")), Date.now() - start);
          } else if (result.sawa) {
            run.passed(item, Date.now() - start);
          } else {
            run.failed(item, new TestMessage(result.ujumbe || l10n.t("Test failed")), Date.now() - start);
          }
        } catch (error) {
          run.errored(
            item,
            new TestMessage(error instanceof Error ? error.message : String(error)),
            Date.now() - start
          );
        }
      }
      run.end();
    },
    true
  );

  context.subscriptions.push(
    controller,
    workspace.onDidSaveTextDocument((document) => {
      if (document.languageId === "asili") {
        void discover(ensureRoot(document.uri));
      }
    })
  );

  void controller.resolveHandler(undefined);
}
