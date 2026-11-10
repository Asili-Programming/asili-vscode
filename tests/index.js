const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vscode = require("vscode");

async function run() {
  const extension = vscode.extensions.getExtension("asili.asili");
  assert.ok(extension, "extension should be available in the test host");
  await extension.activate();

  const registered = new Set(await vscode.commands.getCommands(true));
  for (const command of [
    "asili.build",
    "asili.run",
    "asili.test",
    "asili.testCoverage",
    "asili.newProject",
    "asili.addDependency",
    "asili.removeDependency",
    "asili.verify",
    "asili.repl",
    "asili.lintFile",
    "asili.lintWorkspace",
    "asili.restartServer",
    "asili.showTools",
    "asili.showTrace",
  ]) {
    assert.ok(registered.has(command), `${command} should be registered`);
  }

  const source = await vscode.workspace.openTextDocument({
    language: "asili",
    content: "kazi kuu() {\n}\n",
  });
  const sourceLenses = await vscode.commands.executeCommand(
    "vscode.executeCodeLensProvider",
    source.uri
  );
  const sourceCommands = new Set(sourceLenses.map((lens) => lens.command.command));
  assert.ok(sourceCommands.has("asili.run"));
  assert.ok(sourceCommands.has("asili.debug"));

  const manifest = await vscode.workspace.openTextDocument({
    language: "pata-manifest",
    content: '[tegemezi]\nhisabati = "^1.0"\n',
  });
  const manifestLenses = await vscode.commands.executeCommand(
    "vscode.executeCodeLensProvider",
    manifest.uri
  );
  const manifestCommands = new Set(manifestLenses.map((lens) => lens.command.command));
  assert.ok(manifestCommands.has("asili.addDependency"));
  assert.ok(manifestCommands.has("asili.removeDependency"));

  await testBundledDebugger();
  console.log("VS Code extension host tests passed.");
}

async function testBundledDebugger() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "asili-vscode-debug-"));
  const sourcePath = path.join(root, "kuu.as");
  fs.writeFileSync(
    sourcePath,
    "kazi kuu(hoja: Orodha<Neno>) -> Tupu {\n  weka thamani = 42\n  weka baada = thamani + 1\n  chapisha(\"debugged\")\n}\n"
  );
  const source = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
  const breakpoint = new vscode.SourceBreakpoint(
    new vscode.Location(source.uri, new vscode.Position(2, 0))
  );
  vscode.debug.addBreakpoints([breakpoint]);

  let resolveStopped;
  const stopped = new Promise((resolve) => {
    resolveStopped = resolve;
  });
  let resolveStepped;
  const stepped = new Promise((resolve) => {
    resolveStepped = resolve;
  });
  const adapterMessages = [];
  let stoppedEvents = 0;
  const tracker = vscode.debug.registerDebugAdapterTrackerFactory("asili", {
    createDebugAdapterTracker() {
      return {
        onDidSendMessage(message) {
          adapterMessages.push(
            message.type === "event"
              ? `event:${message.event}`
              : message.type === "response"
                ? `response:${message.command}:${message.success}${message.message ? `:${message.message}` : ""}`
                : `message:${message.type}`
          );
          if (message.type === "event" && message.event === "stopped") {
            stoppedEvents += 1;
            if (stoppedEvents === 1) {
              resolveStopped(message);
            } else if (stoppedEvents === 2) {
              resolveStepped(message);
            }
          }
        },
        onError(error) {
          adapterMessages.push(`error:${error.message}`);
        },
        onExit(code, signal) {
          adapterMessages.push(`exit:${code}:${signal}`);
        },
      };
    },
  });
  let session;
  let stopTimer;
  try {
    const started = await vscode.debug.startDebugging(undefined, {
      type: "asili",
      request: "launch",
      name: "Asili DAP smoke test",
      program: sourcePath,
      cwd: root,
      args: [],
    });
    assert.ok(started, "debug session should start");
    session = vscode.debug.activeDebugSession;
    assert.ok(session, "debug session should be active");

    const firstStop = await Promise.race([
      stopped,
      new Promise((_, reject) => {
        stopTimer = setTimeout(
          () =>
            reject(
              new Error(
                `DAP breakpoint timed out; adapter messages: ${adapterMessages.slice(-12).join(", ")}`
              )
            ),
          10000
        );
      }),
    ]);
    clearTimeout(stopTimer);
    assert.equal(firstStop.body.reason, "breakpoint");
    const stack = await session.customRequest("stackTrace", { threadId: 1 });
    assert.ok(stack.stackFrames.length > 0, "DAP should expose a stopped stack frame");
    const scopes = await session.customRequest("scopes", { frameId: stack.stackFrames[0].id });
    const locals = await session.customRequest("variables", {
      variablesReference: scopes.scopes[0].variablesReference,
    });
    assert.ok(
      locals.variables.some(
        (variable) => variable.name === "thamani" && variable.value === "Namba(42.0)"
      ),
      `DAP locals should include thamani = 42; got ${JSON.stringify(locals.variables)}`
    );
    await session.customRequest("next", { threadId: 1 });
    const stepStop = await Promise.race([
      stepped,
      new Promise((_, reject) => {
        stopTimer = setTimeout(
          () =>
            reject(
              new Error(
                `DAP step timed out; adapter messages: ${adapterMessages.slice(-12).join(", ")}`
              )
            ),
          10000
        );
      }),
    ]);
    clearTimeout(stopTimer);
    assert.equal(stepStop.body.reason, "step");
  } finally {
    clearTimeout(stopTimer);
    tracker.dispose();
    vscode.debug.removeBreakpoints([breakpoint]);
    if (session) {
      await vscode.debug.stopDebugging(session);
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

module.exports = { run };
