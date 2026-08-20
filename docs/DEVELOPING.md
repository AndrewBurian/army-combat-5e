# Developing

Everything needed to run and test the module lives in this repo except the Foundry binary
itself, which is system-provided. The test rig is `.foundry/`, which is gitignored and
disposable: delete it and re-run the setup below to get a clean world.

## Layout

```
.foundry/
├── data/            Foundry --dataPath for the default instance
│   ├── Config/      licence, server options
│   ├── Data/        modules, systems, worlds
│   └── Logs/
├── chrome-profile/  browser profile, including the signed-in Foundry session
└── <name>/          the same data/ and chrome-profile/ pair for a named instance
```

## The Foundry binary

The binary is the one thing not in the repo. This machine uses the **Windows portable** build,
unpacked under `%LOCALAPPDATA%\Programs\`, which is where per-user application installs
conventionally go on Windows: VS Code, Git and Signal all land there. `foundry-server.ps1` also
accepts an install at the profile root, but prefers the conventional location.

Portable is only about where Foundry keeps its own files. An empty marker file,
`App\portable.json`, is the whole switch, and it changes exactly two paths:

- Default user data goes to the install root rather than `%LOCALAPPDATA%\FoundryVTT`.
- Electron's cache, cookies and localStorage go to `ElectronData` beside `App` rather than
  `%APPDATA%\Foundry Virtual Tabletop`.

Server code, licensing and update channels are identical to the installed build. There is no
installer, no uninstaller and no registry entry, so an install is just a directory: unpack to
add one, delete to remove one.

The rig relies on neither default, because `foundry-server.ps1` always passes an explicit
`--dataPath`. What portable does buy is that several generations can sit side by side without
sharing state.

### Updating

Unpack the next portable zip as a sibling, e.g. `%LOCALAPPDATA%\Programs\FoundryVTT-15`.
`foundry-server.ps1` globs `FoundryVTT-*` and takes the highest generation, so nothing here
needs editing. It prints the generation and build it chose on every start; check that line
after an upgrade. Keep the old directory until the module is confirmed working, then delete it.

Because there is no installer, moving an install is just moving the directory, as long as no
server is running out of it.

To pin a specific build, use `-AppPath` or `$env:FOUNDRY_APP`, naming the directory that
contains `main.mjs` (for a portable build, `App\resources\app`). The script fails with the list
of paths it tried rather than starting against the wrong install.

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

## Running from a git worktree

`.foundry/` is gitignored, so a worktree starts with no rig at all: no licence, no system, no
world. Point both scripts at the main checkout's rig instead of setting a second one up:

```powershell
$env:FOUNDRY_RIG = "C:\path\to\army-combat-5e\.foundry"
.\tools\foundry-server.ps1
.\tools\foundry-chrome.ps1
```

`-RigPath` does the same per-invocation. Set it for both scripts or neither: the signed-in
browser profile lives beside the data, so moving one without the other logs the browser in
against a different rig.

The module is still composed from the checkout the script runs in, so what gets tested is the
code being edited in the worktree, against the world in the main rig. The composed module
directory's junctions are re-pointed to whichever checkout ran last, which is why two
checkouts cannot usefully share one rig at the same time — and Foundry's lock on
`Config/options.json` stops them trying.

A rig named by `-RigPath` must already exist. Only the default location is created on demand,
because a typo that silently builds an empty rig is the failure this option exists to prevent.

## Running more than one instance

One unpacked Foundry can back any number of servers. The data directory is what cannot be
shared: Foundry holds a lock on `Config/options.json` while it runs and refuses to start
against a locked directory. So a second server needs its own `-Instance` as well as its own
`-Port`.

```powershell
.\tools\foundry-server.ps1                                # .foundry\data,         :30000
.\tools\foundry-server.ps1 -Instance scratch -Port 30001  # .foundry\scratch\data, :30001
```

An instance is a full rig with its own licence, systems, worlds and browser profile, which is
what makes it useful for testing a migration against a copy of a world, or for running two
Foundry generations at once during an upgrade (point the older server at the older build with
`-AppPath`).

`foundry-chrome.ps1` takes the same `-Instance` and derives the DevTools port from `-Port`
(30000 -> 9222, 30001 -> 9223), so the browsers stay separate too:

```powershell
.\tools\foundry-chrome.ps1 -Instance scratch -Port 30001
```

A new instance starts empty and needs the same one-off setup as a fresh rig. To skip re-entering
the licence key, copy `Config/license.json` from a working instance of the same generation
before first launch; if Foundry rejects it, enter the key again.

## Auto-launch and hot reload

Two settings in the instance's `Config/options.json` make the loop shorter. Both are server
options, so they persist across restarts and need no command-line flags:

- `"world": "army-combat-test"` launches that world at startup instead of stopping at the
  setup screen. The server logs `Launching World | Complete` when it takes.
- `"hotReload": true` watches the active packages and pushes changed files to connected
  browsers over the socket.

Hot reload only covers what `flags.hotReload` in `module.json` declares, and both halves
matter. `extensions` filters by file type, and `paths` restricts which directories are
watched at all — a type listed in `extensions` still never fires if its directory is missing
from `paths`. So the two lists have to agree: `css` needs `styles`, `hbs` needs `templates`,
`json` needs `lang`.

Foundry hot reloads styles, templates and language files. It does not reload `esmodules` —
`.js`/`.mjs` are only ever watched for core itself, and only in debug mode. A change to
anything under `scripts/` still needs a browser refresh.

On startup the server prints one line naming every directory it watches:

```
Watching for changes to army-combat-5e in .../styles, .../templates, .../lang
```

That line is the thing to check when a change does not appear. It reads through the composed
module directory's junctions, so edits made in the repo do reach the watcher.

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
