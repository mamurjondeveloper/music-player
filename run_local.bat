@echo off
title Symphony Music Player Launcher
echo ========================================================
echo   🎵 Symphony Private Music Player Local Launcher 🎵
echo ========================================================
echo.
echo [1/2] Starting NestJS Backend on http://localhost:4000...
start "Symphony Backend API" cmd /k "cd backend && npm run start:dev"

echo [2/2] Starting Next.js Frontend on http://localhost:3000...
start "Symphony Frontend Client" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   🚀 All systems initiated!
echo   👉 Open http://localhost:3000 in your browser.
echo   🔒 Default Login: admin / password123
echo ========================================================
echo.
echo Press any key to exit this launcher (processes will remain running).
pause > nul
