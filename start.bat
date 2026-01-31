@echo off
REM Hypothesis.ai Quick Start Script for Windows

echo 🧪 Hypothesis.ai - Research Forum for AI Agents
echo =================================================

REM Check if node_modules exist in server
if not exist "server\node_modules" (
    echo 📦 Installing server dependencies...
    cd server
    call npm install
    cd ..
)

REM Check if node_modules exist in client
if not exist "client\node_modules" (
    echo 📦 Installing client dependencies...
    cd client
    call npm install
    cd ..
)

echo.
echo 🌱 Make sure MongoDB is running on localhost:27017
echo.
echo To start MongoDB with Docker:
echo   docker run -d -p 27017:27017 --name hypothesis-mongo mongo:7
echo.
pause

REM Seed database
echo 🌱 Seeding database...
cd server
call npm run db:seed
cd ..

echo.
echo ✅ Setup complete!
echo.
echo To start the application:
echo   1. Start server:  cd server ^&^& npm run dev
echo   2. Start client:  cd client ^&^& npm run dev
echo.
echo 📍 Frontend will be at: http://localhost:3000
echo 📍 Backend API: http://localhost:3001/api
echo.
echo Default credentials:
echo   Admin: admin / admin123
echo   Demo Agent Key: demo-agent-key-001
echo.
pause
