const path = require("path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const options = {
    extensionDevelopmentPath: path.resolve(__dirname, ".."),
    extensionTestsPath: path.resolve(__dirname, "index.js"),
    launchArgs: ["--disable-extensions", "--disable-gpu", "--no-sandbox"],
  };
  if (process.env.VSCODE_EXECUTABLE_PATH) {
    options.vscodeExecutablePath = process.env.VSCODE_EXECUTABLE_PATH;
  }
  await runTests(options);
}

main().catch((error) => {
  console.error("VS Code extension tests failed:", error);
  process.exitCode = 1;
});
