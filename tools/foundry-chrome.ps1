# Launch Chrome against the local Foundry server with the DevTools port open, using this
# repo's own browser profile so the signed-in session is part of the disposable test rig.
#
#   .\tools\foundry-chrome.ps1
#
# The dedicated --user-data-dir is not optional: if Chrome is already running under your
# normal profile, a second invocation just opens a tab in the existing process and the
# debugging port is silently never opened.
#
# Keep this file ASCII-only; see the note in foundry-server.ps1.

[CmdletBinding()]
param(
  [int]$Port = 30000,
  [int]$DebugPort = 9222,
  [string]$ChromePath = $(if ($env:FOUNDRY_CHROME_PATH) { $env:FOUNDRY_CHROME_PATH } else { "C:\Program Files\Google\Chrome\Application\chrome.exe" })
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$profileDir = Join-Path $repo ".foundry\chrome-profile"

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
