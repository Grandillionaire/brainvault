#!/bin/bash

# BrainVault Startup Script
echo "🧠 Starting BrainVault..."
echo ""

# Kill any existing processes on port 1420
echo "Checking for existing processes..."
lsof -ti:1420 | xargs kill -9 2>/dev/null && echo "✓ Killed existing server" || echo "✓ No existing server found"

sleep 1

echo "Opening browser at http://localhost:1420"
echo "Press Ctrl+C to stop the server"
echo ""

# Open browser after a short delay (macOS)
(sleep 2 && open http://localhost:1420) &

# Start the development server
npm run dev
