@echo off
REM Smart Attendance System - Deployment Setup for Windows

setlocal enabledelayedexpansion

cls
echo ============================================================
echo  Smart Attendance System - Deployment Setup
echo ============================================================
echo.

REM Step 1: Check Node.js
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% found
echo.

REM Step 2: Check npm
echo [2/6] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo [OK] npm %NPM_VER% found
echo.

REM Step 3: Install backend dependencies
echo [3/6] Installing backend dependencies...
cd /d "%~dp0server"
call npm install --production
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
echo.

REM Step 4: Build frontend
echo [4/6] Building frontend...
cd /d "%~dp0client"
call npm install --production
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)
echo [OK] Frontend built successfully
echo.

REM Step 5: Check environment
echo [5/6] Checking environment configuration...
cd /d "%~dp0server"
if not exist ".env" (
    echo [WARNING] No .env file found
    echo Creating .env from .env.example...
    copy .env.example .env >nul
    echo [WARNING] Please edit server\.env with your MongoDB credentials
) else (
    echo [OK] .env file found
)
echo.

REM Step 6: Test MongoDB connection
echo [6/6] Testing MongoDB connection...
node test-mongo.js
echo.

cls
echo ============================================================
echo  Deployment Preparation Complete
echo ============================================================
echo.
echo Next steps:
echo   1. Configure MongoDB (if not already done)
echo      See: DEPLOYMENT_GUIDE.md
echo.
echo   2. Start server:
echo      cd server
echo      npm start
echo.
echo   3. Test API:
echo      curl http://localhost:5000/api/health
echo.
echo.

REM Ask if user wants to start server
set /p "START_SERVER=Start server now? (Y/N): "
if /i "%START_SERVER%"=="Y" (
    cd /d "%~dp0server"
    call npm start
)

endlocal
