#!/bin/bash

# BrainVault Startup Script
echo "🧠 Starting BrainVault..."
echo ""
echo "Opening browser at http://localhost:1420"
echo "Press Ctrl+C to stop the server"
echo ""

# Open browser after a short delay (macOS)
(sleep 2 && open http://localhost:1420) &

# Start the development server
npm run dev
