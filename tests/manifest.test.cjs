const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

test("English and Swahili package contributions have matching keys", () => {
  const english = readJson("package.nls.json");
  const swahili = readJson("package.nls.sw.json");
  assert.deepEqual(Object.keys(swahili).sort(), Object.keys(english).sort());

  const manifest = readJson("package.json");
  for (const contribution of manifest.contributes.commands) {
    const key = contribution.title.match(/^%(.+)%$/)?.[1];
    assert.ok(key && english[key], `missing command localization: ${contribution.command}`);
  }
});

test("runtime strings and walkthrough media are localized and present", () => {
  const bundle = readJson("l10n/bundle.l10n.sw.json");
  const source = ["src/commands.ts", "src/extension.ts", "src/runtime.ts", "src/testing.ts", "src/trace.ts"]
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");
  for (const [, key] of source.matchAll(/l10n\.t\("([^"]+)"/g)) {
    assert.ok(bundle[key], `missing Swahili runtime translation: ${key}`);
  }

  const manifest = readJson("package.json");
  for (const step of manifest.contributes.walkthroughs.flatMap((walkthrough) => walkthrough.steps)) {
    assert.ok(fs.existsSync(path.join(root, step.media.markdown)), `missing walkthrough: ${step.id}`);
  }
});

test("every contributed command has an implementation and Pata workflow surfaces exist", () => {
  const manifest = readJson("package.json");
  const source = ["src/commands.ts", "src/extension.ts"]
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");
  for (const contribution of manifest.contributes.commands) {
    assert.ok(
      source.includes(`registerCommand("${contribution.command}"`),
      `unregistered command: ${contribution.command}`
    );
  }
  assert.equal(manifest.contributes.debuggers[0].type, "asili");
  assert.ok(manifest.contributes.taskDefinitions.some((task) => task.type === "pata"));
  assert.ok(manifest.contributes.views.explorer.some((view) => view.id === "asili.trace"));
});

test("Pata manifests are not sent to Mwalimu for Asili parsing", () => {
  const manifest = readJson("package.json");
  const source = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
  const documentSelector = source.match(/documentSelector:\s*\[([\s\S]*?)\]/)?.[1];
  assert.ok(documentSelector, "Mwalimu document selector should be declared");
  assert.match(documentSelector, /language:\s*"asili"/);
  assert.doesNotMatch(documentSelector, /pata-manifest/);
  assert.ok(manifest.contributes.languages.some((language) => language.id === "pata-manifest"));
});

test("language activation events are generated from language contributions", () => {
  const manifest = readJson("package.json");
  assert.ok(manifest.contributes.languages.some((language) => language.id === "asili"));
  assert.ok(manifest.contributes.languages.some((language) => language.id === "pata-manifest"));
  assert.ok(manifest.activationEvents.includes("workspaceContains:pata.toml"));
  assert.ok(!manifest.activationEvents.some((event) => event.startsWith("onLanguage:")));
});

test("Explorer and editor menus expose source, artifact, and manifest actions", () => {
  const manifest = readJson("package.json");
  const explorerCommands = manifest.contributes.menus["explorer/context"].map((item) => item.command);
  const editorCommands = manifest.contributes.menus["editor/title"].map((item) => item.command);
  for (const command of ["asili.run", "asili.build", "asili.debug", "asili.runWithTrace", "asili.runArtifact"]) {
    assert.ok(explorerCommands.includes(command), `Explorer should expose ${command}`);
  }
  for (const command of ["asili.addDependency", "asili.removeDependency"]) {
    assert.ok(explorerCommands.includes(command), `pata.toml context should expose ${command}`);
  }
  assert.ok(editorCommands.includes("asili.run"));
  assert.ok(editorCommands.includes("asili.debug"));
  assert.ok(editorCommands.includes("asili.runWithTrace"));
  assert.ok(manifest.contributes.viewsWelcome.some((view) => view.view === "asili.trace"));
});

test("coverage command produces a structured summary and is available as a task", () => {
  const source = fs.readFileSync(path.join(root, "src/commands.ts"), "utf8");
  const manifest = readJson("package.json");
  assert.match(source, /commands\.registerCommand\("asili\.testCoverage",\s*\(\) => showCoverageReport/);
  assert.match(source, /mistari_yaliyotimizwa/);
  assert.match(source, /showInformationMessage\(summary/);
  assert.ok(
    manifest.contributes.taskDefinitions.some((task) => task.type === "pata"),
    "custom Pata tasks should remain available for advanced workflows"
  );
  assert.ok(source.includes('["jaribu", "--chanjo", "--json"]'));
});
