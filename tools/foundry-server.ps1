# Start a local Foundry server against this repo's own data directory.
#
# The Foundry binary is system-provided; everything else the module needs to run lives in
# `.foundry/` here, so the test rig can be thrown away with `rm -r .foundry`.
#
#   .\tools\foundry-server.ps1
#   .\tools\foundry-server.ps1 -Port 30001
#
# Override the binary location with -AppPath or $env:FOUNDRY_APP.
#
# Keep this file ASCII-only: Windows PowerShell 5.1 reads .ps1 as ANSI unless there is a
# BOM, and a UTF-8 em dash decodes to a byte it treats as a smart quote, which opens a
# string and breaks parsing several lines later.

[CmdletBinding()]
param(
  [int]$Port = 30000,
  [string]$AppPath = $env:FOUNDRY_APP,
  [switch]$HotReload,
  [switch]$ComposeOnly
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $repo ".foundry\data"
$moduleDir = Join-Path $dataPath "Data\modules\army-combat-5e"

# Foundry itself is not in this repo, and where it lands differs per machine and per build,
# so probe the usual spots rather than baking one path in. -AppPath and $env:FOUNDRY_APP
# both win over the guesses. What is wanted is the directory holding main.mjs, which for
# the Windows portable build is App\resources\app under the install root.
$appCandidates = @(
  "$env:USERPROFILE\FoundryVTT-14\App\resources\app",
  "$env:LOCALAPPDATA\FoundryVTT\app\resources\app",
  "$env:ProgramFiles\Foundry Virtual Tabletop\resources\app"
)
if (-not $AppPath) {
  $AppPath = $appCandidates | Where-Object { Test-Path (Join-Path $_ "main.mjs") } | Select-Object -First 1
}
if (-not $AppPath) {
  throw ("Could not find Foundry. Set `$env:FOUNDRY_APP or pass -AppPath, naming the " +
         "directory that contains main.mjs. Looked in:`n  " + ($appCandidates -join "`n  "))
}
if (-not (Test-Path (Join-Path $AppPath "main.mjs"))) {
  throw "No main.mjs under '$AppPath'; that is not a Foundry app directory."
}

# Foundry must see the module inside its own data directory, but that data directory now
# lives inside the repo. A junction pointing at the repo root would therefore contain
# itself, and anything that walks the tree (the --hotReload watcher, package backups, the
# file browser) would recurse forever. Expose only the directories the manifest declares.
$moduleDirs = @("scripts", "templates", "styles", "lang")

function Assert-ManifestCovered {
  param([string]$Manifest)
  $json = Get-Content $Manifest -Raw | ConvertFrom-Json
  $referenced = @($json.esmodules) + @($json.styles) + @($json.languages.path) + @($json.flags.hotReload.paths)
  foreach ($path in $referenced | Where-Object { $_ }) {
    $top = ($path -replace '\\', '/').Split('/')[0]
    if ($top -and ($moduleDirs -notcontains $top)) {
      Write-Warning "module.json references '$path' but '$top' is not linked; it will be missing from the composed module directory."
    }
  }
}

function New-ComposedModuleDir {
  New-Item -ItemType Directory -Force -Path $moduleDir | Out-Null

  foreach ($name in $moduleDirs) {
    $link = Join-Path $moduleDir $name
    $target = Join-Path $repo $name
    if (-not (Test-Path $target)) { Write-Warning "no such directory to link: $target"; continue }

    if (Test-Path $link) {
      $item = Get-Item $link -Force
      $isLink = [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
      if ($isLink -and ($item.Target -eq $target)) { continue }
      # Never use Remove-Item -Recurse here: following a junction would delete the repo's
      # own files. rmdir drops the reparse point and leaves the target alone.
      if ($isLink) { cmd /c rmdir "$link" | Out-Null }
      else { throw "$link exists and is a real directory, not a link. Remove it by hand." }
    }
    New-Item -ItemType Junction -Path $link -Target $target | Out-Null
  }

  # A copy, not a link: Windows will not create file symlinks without admin, and a hardlink
  # silently detaches the first time an editor saves by write-and-rename. Refreshing it on
  # every start is enough, because Foundry only reads manifests at server startup anyway.
  Copy-Item (Join-Path $repo "module.json") (Join-Path $moduleDir "module.json") -Force
}

Assert-ManifestCovered (Join-Path $repo "module.json")
New-ComposedModuleDir
Write-Host "composed module dir: $moduleDir" -ForegroundColor Green
if ($ComposeOnly) { return }

$serverArgs = @(
  "main.mjs",
  "--dataPath=$dataPath",
  "--port=$Port",
  "--headless",
  "--noupnp"
)
if ($HotReload) { $serverArgs += "--hotReload" }

Write-Host "data path: $dataPath" -ForegroundColor Green
Write-Host "listening on http://localhost:$Port" -ForegroundColor Green
Push-Location $AppPath
try { & node @serverArgs } finally { Pop-Location }
