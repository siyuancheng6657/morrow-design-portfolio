@echo off
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-site.ps1" -Action Start -OpenBrowser
if errorlevel 1 pause
