@echo off
rem ---------------------------------------------------------------------------
rem Launcher for scripts\build-portable.ps1.
rem
rem A default Windows install has script execution disabled, so running
rem     .\scripts\build-portable.ps1
rem fails with:
rem     "...cannot be loaded because running scripts is disabled on this system"
rem     CategoryInfo: SecurityError, FullyQualifiedErrorId: UnauthorizedAccess
rem
rem Keep this file ASCII-only: cmd.exe reads batch files in the OEM codepage, not
rem UTF-8, so non-ASCII comments come out as mojibake.
rem This wrapper passes -ExecutionPolicy Bypass, which applies to THIS process
rem only -- no machine-wide setting is changed and no admin rights are needed.
rem
rem Usage:
rem     scripts\build-portable.cmd
rem     scripts\build-portable.cmd -Arch arm64
rem
rem If this still fails, the policy is enforced by Group Policy, and the
rem -ExecutionPolicy flag is ignored in that case. Ask IT, or run PowerShell as:
rem     Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
rem ---------------------------------------------------------------------------
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-portable.ps1" %*
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo Build failed with exit code %RC%.
)

exit /b %RC%
