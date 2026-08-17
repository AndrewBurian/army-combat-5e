# Developing

Everything needed to run and test the module lives in this repo except the Foundry binary
itself, which is system-provided. The test rig is `.foundry/`, which is gitignored and
disposable: delete it and re-run the setup below to get a clean world.

## Layout

```
.foundry/
├── data/            Foundry --dataPath
│   ├── Config/      licence, server options
│   ├── Data/        modules, systems, worlds
│   └── Logs/
└── chrome-profile/  browser profile, including the signed-in Foundry session
```

The Foundry binary is the one thing not in the repo. `foundry-server.ps1` probes the usual
install locations; point it elsewhere with `-AppPath` or `$env:FOUNDRY_APP`, naming the
directory that contains `main.mjs` (for the Windows portable build, `App\resources\app`).
It fails with the list of paths it tried rather than starting against the wrong install.

## Running

```powershell
.\tools\foundry-server.ps1     # composes the module dir, then serves on :30000
.\tools\foundry-chrome.ps1     # Chrome with the DevTools port open, on the local world
```

The server runs headless under plain `node` rather than Electron; Foundry's bundled native
modules load fine that way. It needs Node 24.

`foundry-chrome.ps1` uses a dedicated `--user-data-dir`. That is not optional: if Chrome is
already running under your normal profile, a second invocation just opens a tab in the
existing process and the debugging port is silently never opened.

## How the module reaches Foundry

Foundry only loads modules from inside its own data directory, but that data directory now
lives inside this repo. A junction from `Data/modules/army-combat-5e` to the repo root would
therefore contain itself, and anything that walks the tree recurses forever, including the
`--hotReload` watcher and package backups.

So `foundry-server.ps1` composes the module directory instead, out of one junction per
directory the manifest declares (`scripts`, `templates`, `styles`, `lang`) plus a copy of
`module.json`. Edits to linked files are live. `module.json` is a copy because Windows will
not create file symlinks without admin and a hardlink detaches the first time an editor
saves by write-and-rename; it is refreshed on every start, which is enough because Foundry
only reads manifests at server startup anyway.

A side benefit is that Foundry never sees `docs/`, `.git/` or `.secret/` at all.

If you add a top-level directory the manifest references, add it to `$moduleDirs` in
`tools/foundry-server.ps1`. The script warns if `module.json` references one that is missing.

## From scratch

If `.foundry/` does not exist, the server starts with an empty data directory and needs
three one-off steps, all doable from the browser at <http://localhost:30000>:

1. Enter your licence key and sign the EULA.
2. Install the **dnd5e** system (5.3+).
3. Create a world on that system, launch it, and enable the module in *Settings > Manage
   Modules*.

Foundry creates a `Gamemaster` user with no password on first launch of a fresh world.

## Testing against the live world

There is an MCP server at `../foundry-mcp` that drives the running world over the Chrome
DevTools Protocol. Register it by copying `.mcp.json.example` to `.mcp.json` and filling in
the two absolute paths; the real file is gitignored because those paths are machine-specific.
Check it can connect with:

```powershell
node ..\foundry-mcp\dist\probe.js
```

Ad-hoc probing without the MCP server is just CDP: see the scratch helpers in `.tmp/`.

## Gotchas

- **Keep `tools/*.ps1` ASCII-only.** Windows PowerShell 5.1 reads `.ps1` as ANSI unless the
  file has a BOM, and a UTF-8 em dash decodes to a byte it treats as a smart quote, which
  opens a string and produces a parse error many lines away from the real cause.
- **Never `Remove-Item -Recurse` inside the composed module directory.** Following a
  junction would delete the repo's own files. Use `cmd /c rmdir` to drop a junction.
