const assert = require("assert");
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
  console.log("VS Code extension host tests passed.");
}

module.exports = { run };
