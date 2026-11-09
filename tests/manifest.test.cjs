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
