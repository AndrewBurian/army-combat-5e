# Launch Chrome against the local Foundry server with the DevTools port open, using this
# repo's own browser profile so the signed-in session is part of the disposable test rig.
#
#   .\tools\foundry-chrome.ps1
#   .\tools\foundry-chrome.ps1 -Instance scratch -Port 30001
#   .\tools\foundry-chrome.ps1 -RigPath ..\..\..\.foundry    # from a worktree
#
# The dedicated --user-data-dir is not optional: if Chrome is already running under your
# normal profile, a second invocation just opens a tab in the existing process and the
# debugging port is silently never opened. The same applies between instances, which is why
# each one gets its own profile directory and its own DevTools port.
#
# Keep this file ASCII-only; see the note in foundry-server.ps1.

[CmdletBinding()]
param(
  [string]$Instance = "",
  [int]$Port = 30000,
  [int]$DebugPort = 0,
  [string]$RigPath = $env:FOUNDRY_RIG,
  [string]$ChromePath = $(if ($env:FOUNDRY_CHROME_PATH) { $env:FOUNDRY_CHROME_PATH } else { "C:\Program Files\Google\Chrome\Application\chrome.exe" })
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

# Resolve the rig exactly as foundry-server.ps1 does, so the same -RigPath and -Instance reach
# the same place. The signed-in browser profile lives beside the data, so pointing the server
# at another rig without pointing the browser there too would log in against the wrong one.
$rigRoot = if ($RigPath) { $RigPath } else { Join-Path $repo ".foundry" }
if ($RigPath -and -not (Test-Path $rigRoot)) {
  throw "No rig at '$rigRoot'. -RigPath must name an existing .foundry directory."
}
if ($Instance -and ($Instance -notmatch '^[A-Za-z0-9._-]+$')) {
  throw "Instance name '$Instance' must be letters, digits, dot, dash or underscore."
}
$instanceRoot = if ($Instance) { Join-Path $rigRoot $Instance } else { $rigRoot }
$profileDir = Join-Path $instanceRoot "chrome-profile"

# One DevTools port per server port, so -Port 30001 needs no second flag to stay clear of the
# browser already attached to 30000. Pass -DebugPort to override.
if (-not $DebugPort) { $DebugPort = 9222 + ($Port - 30000) }

$listening = [bool](Get-NetTCPConnection -LocalPort $DebugPort -State Listen -ErrorAction SilentlyContinue)
if ($listening) {
  Write-Host "DevTools port $DebugPort is already answering; leaving the running browser alone." -ForegroundColor Yellow
  return
}

New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

# Start-Process, not `cmd /c start`: the latter hangs when run from a non-interactive shell.
Start-Process -FilePath $ChromePath -ArgumentList @(
  "--remote-debugging-port=$DebugPort",
  "--user-data-dir=$profileDir",
  "--no-first-run",
  "--no-default-browser-check",
  "http://localhost:$Port/game"
) | Out-Null

Write-Host "chrome profile: $profileDir" -ForegroundColor Green
Write-Host "devtools: http://127.0.0.1:$DebugPort" -ForegroundColor Green
