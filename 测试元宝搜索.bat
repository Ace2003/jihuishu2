@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Please install Node.js 18+ from https://nodejs.org/
  pause
  exit /b 1
)
echo SearchPro API connectivity test - one billable search may be used.
node scripts/check-yuanbao.mjs "AI 创业者 公开活动"
pause
