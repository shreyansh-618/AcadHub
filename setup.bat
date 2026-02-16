@echo off
REM Academic Platform Setup Script (Windows)

echo ======================================
echo Academic Platform Setup Script
echo ======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed
    echo Please install Python from https://www.python.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] Python found: %PYTHON_VERSION%

echo.

REM Setup Frontend
echo Setting up Frontend...
cd frontend
echo Installing dependencies...
call npm install --no-audit --no-fund
if exist .env.example (
    copy .env.example .env.local >nul
    echo [OK] Frontend setup complete
)
cd ..

REM Setup Backend
echo.
echo Setting up Backend...
cd backend
echo Installing dependencies...
call npm install --no-audit --no-fund
if exist .env.example (
    copy .env.example .env >nul
    echo [OK] Backend setup complete
)
cd ..

REM Setup AI Service
echo.
echo Setting up AI Service...
cd ai-service
echo Installing dependencies...
call python -m pip install -r requirements.txt >nul 2>&1
if exist .env.example (
    copy .env.example .env >nul
    echo [OK] AI Service setup complete
)
cd ..

echo.
echo ======================================
echo [SUCCESS] Setup completed successfully!
echo ======================================
echo.
echo Next steps:
echo 1. Update .env files with your configuration:
echo    - frontend\.env.local
echo    - backend\.env
echo    - ai-service\.env
echo.
echo 2. Start development servers:
echo    Terminal 1 - Frontend:     cd frontend ^&^& npm run dev
echo    Terminal 2 - Backend:      cd backend ^&^& npm run dev
echo    Terminal 3 - AI Service:   cd ai-service ^&^& python main.py
echo.
echo 3. Visit http://localhost:5173 in your browser
echo.
pause
