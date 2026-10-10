#Requires -Version 5.1
<#
.SYNOPSIS
  Build a portable, self-contained Windows zip of the Library Project.

.DESCRIPTION
  Windows counterpart of scripts/build-portable.sh.

  The zip bundles a portable Node runtime, the Next.js standalone server
  (including the better_sqlite3 native module), all assets and the setup script,
  so the target machine needs no install and no internet access.

  The zip deliberately does NOT contain a .env. Next's output tracing copies the
  build machine's .env -- with its real SESSION_SECRET -- into the standalone
  output, which would hand a working secret to everyone who unzips a release
  (enough to mint valid admin session cookies). .env.example ships instead, and
  start.cmd generates a per-install .env via ensure-env.mjs on first launch.

.PARAMETER Arch
  Target architecture: x64 (default) or arm64.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\build-portable.ps1
  powershell -ExecutionPolicy Bypass -File scripts\build-portable.ps1 -Arch arm64

.OUTPUTS
  dist\LibraryProject-portable-win-<arch>.zip
  On the target: unzip, then run start.cmd.
#>
[CmdletBinding()]
param(
  [ValidateSet("x64", "arm64")]
  [string]$Arch = "x64"
)

$ErrorActionPreference = "Stop"

# --- config ------------------------------------------------------------------
# Node 22 LTS: its Windows builds run on Windows 10 and later, and prebuilt
# better-sqlite3 / sharp binaries exist for both win-x64 and win-arm64.
$NodeVersion = "v22.14.0"
$OsName      = "win"
$NodeDirName = "node-$NodeVersion-$OsName-$Arch"
$NodeUrl     = "https://nodejs.org/dist/$NodeVersion/$NodeDirName.zip"
$ZipName     = "LibraryProject-portable-win-$Arch.zip"

# --- paths -------------------------------------------------------------------
# $PSScriptRoot is the directory of this .ps1, so the script works from anywhere.
$ProjectDir = Split-Path -Parent $PSScriptRoot
$Dist       = Join-Path $ProjectDir "dist"
# Isolated working copy -- the real project is never touched. Keep it OUTSIDE the
# project tree: a stage nested under the project makes Next emit a broken
# standalone output (native modules like better-sqlite3 get dropped).
$Stage      = Join-Path $env:TEMP "library-project-build"
$AppDir     = Join-Path $Dist "app"

function Info([string]$Message) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Fail([string]$Message) { Write-Host "ERROR: $Message" -ForegroundColor Red; exit 1 }

# robocopy reports success as exit codes 0-7 and failure as 8+.
# NOTE: the argument holder is $RoboArgs, deliberately not $Args -- $Args is an
# automatic PowerShell variable and must not be assigned.
function Copy-Tree([string]$From, [string]$To, [string[]]$ExcludeDirs, [string[]]$ExcludeFiles) {
  $RoboArgs = @($From, $To, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
  if ($ExcludeDirs)  { $RoboArgs += "/XD"; $RoboArgs += $ExcludeDirs }
  if ($ExcludeFiles) { $RoboArgs += "/XF"; $RoboArgs += $ExcludeFiles }
  & robocopy @RoboArgs | Out-Null
  if ($LASTEXITCODE -ge 8) { Fail "robocopy '$From' -> '$To' failed (exit $LASTEXITCODE)" }
}

# --- 0. sanity ---------------------------------------------------------------
if (-not (Test-Path (Join-Path $ProjectDir "package.json"))) {
  Fail "package.json not found -- run this from the project tree"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Fail "npm not found on PATH (the host needs a Node/npm to bootstrap the build)"
}

# --- 1. portable node (download first, drive the whole build with it) ---------
Info "Fetching portable Node $NodeVersion ($OsName-$Arch)"
if (Test-Path $Dist) { Remove-Item -Recurse -Force $Dist }
New-Item -ItemType Directory -Path $Dist | Out-Null

$NodeZip = Join-Path $Dist "$NodeDirName.zip"
if (-not (Test-Path $NodeZip)) {
  # WebClient rather than Invoke-WebRequest: on Windows PowerShell 5.1 the latter
  # depends on the IE engine, and -UseBasicParsing was removed in PowerShell 7.
  # WebClient behaves identically on both. nodejs.org requires TLS 1.2.
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  (New-Object System.Net.WebClient).DownloadFile($NodeUrl, $NodeZip)
}
Expand-Archive -Path $NodeZip -DestinationPath $Dist -Force
Move-Item -Path (Join-Path $Dist $NodeDirName) -Destination (Join-Path $Dist "node")

$NodeBinDir = Join-Path $Dist "node"
$NodeExe    = Join-Path $NodeBinDir "node.exe"
$NpmCmd     = Join-Path $NodeBinDir "npm.cmd"

# CRITICAL: prepend the bundled Node so EVERY child process (npm, node-gyp,
# prebuild-install) uses it. Otherwise better_sqlite3 is built for the host
# Node's ABI and crashes on the target machine at launch.
$env:PATH = "$NodeBinDir;$env:PATH"
Info "Using $(& $NodeExe -v) for the build"

# --- 2. stage a fresh copy of the project ------------------------------------
Info "Staging project copy (source only, no node_modules/.next/dist)"
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Path $Stage | Out-Null

Copy-Tree -From $ProjectDir -To $Stage `
  -ExcludeDirs  @("node_modules", ".next", "dist", ".git") `
  -ExcludeFiles @(".DS_Store", "library.db", "library.db-shm", "library.db-wal")

Push-Location $Stage
try {
  # --- 3. install deps under portable Node -----------------------------------
  # A FRESH install under portable Node is what makes better_sqlite3 resolve for
  # the Node 22 ABI (127) instead of inheriting the host's.
  Info "Installing dependencies under portable Node (fresh, correct ABI)"
  & $NpmCmd install
  if ($LASTEXITCODE -ne 0) { Fail "npm install failed" }

  # --- 4. setup database (idempotent) ----------------------------------------
  Info "Running initial setup (tables + seed data + admin/demo users)"
  & $NpmCmd run setup
  if ($LASTEXITCODE -ne 0) { Fail "npm run setup failed" }

  # --- 5. build standalone ---------------------------------------------------
  Info "Building Next.js standalone output"
  & $NpmCmd run build
  if ($LASTEXITCODE -ne 0) { Fail "npm run build failed" }
  if (-not (Test-Path ".next\standalone")) {
    Fail "Standalone output not found (check output: 'standalone' in next.config.ts)"
  }

  # --- 6. assemble app folder ------------------------------------------------
  Info "Assembling app bundle"
  New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
  Copy-Tree -From (Join-Path $Stage ".next\standalone") -To $AppDir
  if (Test-Path ".next\static") {
    New-Item -ItemType Directory -Path (Join-Path $AppDir ".next\static") -Force | Out-Null
    Copy-Tree -From (Join-Path $Stage ".next\static") -To (Join-Path $AppDir ".next\static")
  }
  if (Test-Path "public") {
    Copy-Tree -From (Join-Path $Stage "public") -To (Join-Path $AppDir "public")
  }

  # Compile the setup script into a single JS bundle and ship it. The bundled
  # server runs it on first launch to create the DB on the TARGET machine, not a
  # build-time snapshot.
  Info "Compiling setup script"
  & $NpmCmd run build:setup
  if ($LASTEXITCODE -ne 0) { Fail "npm run build:setup failed" }
  Copy-Item (Join-Path $Stage "dist\setup.cjs") (Join-Path $AppDir "setup.js") -Force
} finally {
  Pop-Location
}

# --- 7. replace the traced .env with the template ----------------------------
# This is the step that fixes the SESSION_SECRET leak: output tracing copies the
# build machine's .env into the standalone output.
Info "Removing the traced .env and shipping the template"
$TracedEnv = Join-Path $AppDir ".env"
if (Test-Path $TracedEnv) { Remove-Item -Force $TracedEnv }
Copy-Item (Join-Path $ProjectDir ".env.example")           (Join-Path $AppDir ".env.example")   -Force
Copy-Item (Join-Path $ProjectDir "scripts\ensure-env.mjs") (Join-Path $AppDir "ensure-env.mjs") -Force

# Remove any DB baked in by output tracing -- setup.js creates it fresh on first
# launch, so the shipped build is always "initial state".
foreach ($DbFile in @("library.db", "library.db-shm", "library.db-wal")) {
  $Path = Join-Path $AppDir $DbFile
  if (Test-Path $Path) { Remove-Item -Force $Path }
}

# Strip dev logs and any non-demo ebook files (setup.js recreates the demo
# ebooks on the target machine's first launch).
$LogsDir = Join-Path $AppDir "logs"
if (Test-Path $LogsDir) { Remove-Item -Recurse -Force $LogsDir }
$EbookDir = Join-Path $AppDir "assets\ebooks"
if (Test-Path $EbookDir) {
  Get-ChildItem -Path $EbookDir -File | Where-Object { $_.Name -notlike "demo-*" } | Remove-Item -Force
}

# --- 8. start script ---------------------------------------------------------
Info "Creating start.cmd"
$StartCmd = @'
@echo off
setlocal
rem Start the Library Project. No installs, no internet needed.
set "DIR=%~dp0"
echo Starting Library Project...

rem cd into app\ so process.cwd() resolves to the bundled directory
rem (server finds .next, and db.ts finds library.db next to server.js)
cd /d "%DIR%app"

rem First launch: generate .env from .env.example with a fresh SESSION_SECRET.
rem A no-op once .env exists, so your edited config is never overwritten.
rem Required before the server starts: src\lib\session.ts hashes SESSION_SECRET
rem at import time and the app cannot start without it.
if not exist .env (
  echo First run detected - generating .env...
  "%DIR%node\node.exe" ensure-env.mjs || (echo Could not create .env & exit /b 1)
)

rem First launch: create the database (tables + admin + demo data)
if not exist library.db (
  echo First run detected - running initial setup...
  "%DIR%node\node.exe" setup.js || (echo Setup failed & exit /b 1)
)

"%DIR%node\node.exe" server.js
'@
# cmd.exe expects CRLF line endings.
($StartCmd -replace "`r?`n", "`r`n") | Set-Content -Path (Join-Path $Dist "start.cmd") -Encoding ASCII

# --- 9. zip -----------------------------------------------------------------
# Refuse to ship a bundle carrying a real .env -- this is the check that would
# have caught the SESSION_SECRET leak, so keep it before zipping.
if (Test-Path $TracedEnv) {
  Fail "refusing to build: app\.env is present and would leak SESSION_SECRET"
}
foreach ($Required in @(".env.example", "ensure-env.mjs")) {
  if (-not (Test-Path (Join-Path $AppDir $Required))) {
    Fail "app\$Required missing from the bundle"
  }
}

Info "Creating $ZipName"
# The downloaded Node archive must not end up in the release.
if (Test-Path $NodeZip) { Remove-Item -Force $NodeZip }
$ZipPath = Join-Path $Dist $ZipName
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
# ZipFile::CreateFromDirectory rather than Compress-Archive: the latter skips
# files carrying the Hidden attribute and fails on paths over 260 chars.
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $Dist, $ZipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Write-Host ""
Write-Host "Done! Your portable build is at: dist\$ZipName"
Write-Host "To run on a Windows $Arch machine: unzip, then double-click start.cmd"
Write-Host "Bundled Node $NodeVersion (Windows 10+)."
Write-Host "SESSION_SECRET is generated on first launch by start.cmd, not shipped."
