$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Installér Node.js, og kør pnpm install i projektmappen.' }
if (-not (Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) { throw 'Projektets pakker mangler. Kør pnpm install først.' }
& $nodeCommand.Source 'node_modules/vite/bin/vite.js' --host 127.0.0.1 --open
