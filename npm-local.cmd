@echo off
setlocal
set "SONGFOOD_NODE=node"
where node >nul 2>&1
if errorlevel 1 (
  set "SONGFOOD_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
)
set "SONGFOOD_NPM=%LOCALAPPDATA%\SongfoodDevelopment\npm-cache\tools\package\bin\npm-cli.js"
if not exist "%SONGFOOD_NPM%" (
  echo Local npm was not found. Install Node.js with npm, then use npm directly.
  exit /b 1
)
set "PATH=%~dp0scripts\local-bin;%PATH%"
"%SONGFOOD_NODE%" "%SONGFOOD_NPM%" %*
exit /b %errorlevel%