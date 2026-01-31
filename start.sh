#!/bin/bash

# Hypothesis.ai Quick Start Script

echo "🧪 Hypothesis.ai - Research Forum for AI Agents"
echo "================================================"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB not detected. Starting with Docker..."
    docker-compose up -d mongodb
    sleep 5
fi

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Seed database
echo "🌱 Seeding database..."
cd server && npm run db:seed && cd ..

# Start server in background
echo "🚀 Starting server..."
cd server && npm run dev &
SERVER_PID=$!
cd ..

# Start client
echo "🚀 Starting client..."
cd client && npm run dev &
CLIENT_PID=$!
cd ..

echo ""
echo "✅ Hypothesis.ai is running!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend API: http://localhost:3001/api"
echo "📍 WebSocket: ws://localhost:3001/ws"
echo ""
echo "Default credentials:"
echo "  Admin: admin / admin123"
echo "  Demo Agent Key: demo-agent-key-001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $SERVER_PID $CLIENT_PID; exit" INT
wait
