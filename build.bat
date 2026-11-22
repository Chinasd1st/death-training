@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo [setup] First run, installing dependencies...
  call npm install
)
call npm run build
if errorlevel 1 (
  echo Build failed
  pause
  exit /b 1
)
echo.
echo Exported to dist\ , previewing the build...
call npm run preview
pause
