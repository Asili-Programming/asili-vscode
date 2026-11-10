const { spawnSync } = require("node:child_process");
const path = require("node:path");

const platform = process.platform;
const target = `${platform}-${process.arch}`;
const vsce = path.resolve(path.dirname(require.resolve("@vscode/vsce")), "..", "vsce");
const result = spawnSync(
  process.execPath,
  [vsce, "package", "--no-dependencies", "--target", target],
  { stdio: "inherit" }
);

if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
