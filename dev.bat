@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo [setup] First run, installing dependencies...
  call npm install
)
echo Dev server. On the same Wi-Fi, open the "Network" URL on your phone.
call npm run dev
pause
