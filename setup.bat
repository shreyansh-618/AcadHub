@echo off
REM Smart Setup Script (Windows)

echo ======================================
echo Smart Setup Script
echo ======================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%
echo.

echo Setting up Frontend...
cd frontend
call npm install --no-audit --no-fund
cd ..

echo.
echo Setting up Backend...
cd backend
call npm install --no-audit --no-fund
cd ..

echo.
echo Setting up Mobile App...
cd mobile-app
call npm install --no-audit --no-fund
cd ..

echo.
echo ======================================
echo [SUCCESS] Setup completed successfully!
echo ======================================
echo.
echo Next steps:
echo 1. Update:
echo    - frontend\.env
echo    - backend\.env
echo    - mobile-app app config / env
echo.
echo 2. Start development servers:
echo    Terminal 1 - Frontend:   cd frontend ^&^& npm run dev
echo    Terminal 2 - Backend:    cd backend ^&^& npm run dev
echo    Terminal 3 - Mobile:     cd mobile-app ^&^& npm start
echo.
echo 3. Visit http://localhost:5173 in your browser
echo.
pause
