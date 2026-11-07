# Asili VS Code extension — Design Brief

As of 7 November 2026 · Victor Kaiuki

The extension should feel native to VS Code: theme colours, codicons and VS Code's own patterns.
Asili's identity shows in three places only: the extension icon, the file icon and the words.

## Principles

- **Native first.** Use the Testing API, tasks, debug views and quick picks instead of custom panels.
  No webviews in v1 except the walkthrough's built-in media.
- **One obvious action per place.** CodeLens shows at most two actions; the status bar item is one
  item, not a row.
- **Never advertise what does not work.** A feature the tool cannot do yet is hidden or disabled,
  not an error after a click.

## Words

Command titles follow `Asili: <verb> <object>` with the verb in the imperative, Swahili first.
Drafts for native-speaker review, consistent with the CLI's own help text:

| Command id | Swahili title | English title |
| --- | --- | --- |
| `asili.build` | Asili: Jenga mradi | Asili: Build Project |
| `asili.run` | Asili: Endesha | Asili: Run |
| `asili.runWithTrace` | Asili: Endesha kwa ufuatiliaji | Asili: Run with Trace |
| `asili.selectTarget` | Asili: Chagua lengo la kujenga | Asili: Select Build Target |
| `asili.test` | Asili: Endesha majaribio | Asili: Run Tests |
| `asili.testCoverage` | Asili: Majaribio na chanjo | Asili: Run Tests with Coverage |
| `asili.formatProject` | Asili: Nadhifisha mradi | Asili: Format Project |
| `asili.formatCheck` | Asili: Kagua mpangilio | Asili: Check Formatting |
| `asili.lintFile` | Asili: Kagua faili hii | Asili: Lint Current File |
| `asili.lintWorkspace` | Asili: Kagua mradi wote | Asili: Lint Workspace |
| `asili.verify` | Asili: Thibitisha mradi | Asili: Verify Project |
| `asili.newProject` | Asili: Unda mradi mpya | Asili: New Project |
| `asili.addDependency` | Asili: Ongeza tegemezi | Asili: Add Dependency |
| `asili.removeDependency` | Asili: Ondoa tegemezi | Asili: Remove Dependency |
| `asili.repl` | Asili: Fungua REPL | Asili: Open REPL |
| `asili.workspaceInfo` | Asili: Onyesha wanachama wa workspace | Asili: Show Workspace Members |
| `asili.showTools` | Asili: Onyesha zana | Asili: Show Tools |
| `asili.restartServer` | Asili: Anzisha upya Mwalimu | Asili: Restart Language Server |

Notification text: one sentence saying what happened, one action button. No exclamation marks.

## Icons

- **Extension icon:** the logo's tree mark (no wordmark) on the paper colour `#f0f0ed`, from the
  vector logo the website's Design Brief asks for. 256 × 256 PNG.
- **File icon** for `.as` and `.asi`: the mark simplified to read at 16 px; light and dark variants.
  Contributed through `languages[].icon`, so it shows even without a file-icon theme.
- **Codicons** everywhere else: `$(play)` Endesha, `$(debug-alt)` Tatua, `$(beaker)` tests,
  `$(tools)` show tools, `$(sync~spin)` while Mwalimu starts, `$(warning)` when it is down.

## Colour

None of our own. All colours come from the theme (`statusBarItem.warningBackground` for a stopped
server, testing colours for coverage). Semantic tokens from Mwalimu map to standard token types so
every theme colours Asili correctly.

## Status bar

```text
$(check) Mwalimu · native        normal
$(sync~spin) Mwalimu             starting
$(warning) Mwalimu               stopped (warning background)
```

Hover shows the tool paths and versions; click opens a quick pick with Jenga, Endesha, Jaribu,
Chagua lengo, Onyesha zana, Anzisha upya Mwalimu.

## Walkthrough

Five steps, each with one short paragraph, one button and one image or animation of real use:

1. Unda au fungua mradi (new or open project).
2. Endesha programu (run, from CodeLens).
3. Majaribio (Test Explorer and coverage).
4. Tatua (breakpoint and variables).
5. Mwalimu anakusaidia (hover, completion, rename, quick fixes, format on save).

Images are real screenshots in light and dark themes, under 200 KB each.

## Marketplace page

The extension README becomes the Marketplace page: one-line description, a 20-second GIF of run,
test and debug, the tool coverage table, settings, and a link to the wiki's Editor Support page.
Swahili first, English below.
