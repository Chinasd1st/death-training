@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

rem ===== One-click push + deploy to GitHub Pages =====
rem Usage: deploy.bat [repo-name]   (default: death-training)

set "REPO=%~1"
if "%REPO%"=="" set "REPO=death-training"

where git >nul 2>nul
if errorlevel 1 (
  echo [x] git not found
  pause
  exit /b 1
)
where gh >nul 2>nul
if errorlevel 1 (
  echo [x] gh not found
  pause
  exit /b 1
)

gh auth status >nul 2>nul
if errorlevel 1 (
  echo [i] gh is not logged in, starting login...
  gh auth login -w
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
for /f "delims=" %%u in ('gh api user --jq .login') do set "OWNER=%%u"
echo [i] GitHub user: %OWNER%   repo: %REPO%

rem 1) Local build first (also creates package-lock.json)
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run build
if errorlevel 1 (
  echo [x] Local build failed, nothing pushed
  pause
  exit /b 1
)

rem 2) git init + commit
if not exist .git git init -b main
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "deploy: death training website"
) else (
  echo [i] Nothing new to commit
)
git branch -M main

rem 3) Create remote repo if missing, then push
set "NEWREPO="
gh repo view %OWNER%/%REPO% >nul 2>nul
if errorlevel 1 (
  echo [i] Creating public repo %OWNER%/%REPO% ...
  gh repo create %REPO% --public --source . --remote origin --push
  if errorlevel 1 (
    pause
    exit /b 1
  )
  set "NEWREPO=1"
) else (
  git remote get-url origin >nul 2>nul
  if errorlevel 1 git remote add origin https://github.com/%OWNER%/%REPO%.git
  git push -u origin main
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

rem 4) Enable Pages with GitHub Actions as source (update if already enabled)
gh api -X POST repos/%OWNER%/%REPO%/pages -f build_type=workflow >nul 2>nul
if errorlevel 1 gh api -X PUT repos/%OWNER%/%REPO%/pages -f build_type=workflow >nul 2>nul

rem 5) The push already triggers a deploy run. Only on a brand-new repo
rem    (Pages was not enabled yet when that first run started) trigger one more.
rem    Runs share one concurrency group, so an older queued run may show
rem    "Canceling since a higher priority waiting request for pages exists" - that is expected.
if defined NEWREPO (
  timeout /t 3 >nul
  gh workflow run deploy.yml >nul 2>nul
)
timeout /t 8 >nul
set "RUN="
for /f "delims=" %%r in ('gh run list --workflow deploy.yml --limit 1 --json databaseId --jq ".[0].databaseId"') do set "RUN=%%r"
if defined RUN (
  echo [i] Waiting for deploy run !RUN! ...
  gh run watch !RUN! --exit-status
)

echo.
echo ============================================================
echo  Site: https://%OWNER%.github.io/%REPO%/
echo ============================================================
pause
